/*
 * The viewer: resolves a tree path, renders the tree, shows the detail panel.
 *
 * Served as 404.html from arbitrary path depth, so nothing here may use a
 * relative URL: the browser would resolve it against the requested path rather
 * than against this file. The output root is derived from the requested path
 * instead — everything before the first "/tree/" segment. "tree" occurs nowhere
 * as an element name in the instance tree, so the split is unambiguous.
 *
 * The same file is also published as one document with the model inlined
 * (`build --single`), read from a disk rather than served. Its address lives in
 * the fragment: file:// lets a page change nothing else about its URL.
 *
 * Only expanded nodes are put into the DOM. The full tree has 54,552 nodes;
 * rendering it in one go is not a performance concern to be optimised later,
 * it is the reason the renderer is written the way it is.
 */

(function () {
  "use strict";

  var TREE_SEGMENT = "/tree/";
  var MODEL_FILE = "/cpacs-doc-model.json";
  var MODEL_ELEMENT = "cd-model";
  var ROOT_TOKEN = "%ROOT%";

  var state = {
    root: "",          // path prefix the site is deployed under
    model: null,
    path: [],          // selected instance path, without the root element
    cursor: [],        // path the keyboard points at, apart from the selection
    cursorIndex: null, // position of the cursor row in `rows`
    rows: [],          // rendered rows in visual order, rebuilt with the tree
    expanded: null,    // Set of expanded paths
    nodeByPath: null,  // path -> model node
    searchEntries: null,  // built on first search, not on load
    searchFilter: "all",  // which kind the results are narrowed to, page-lifetime
    usage: null,          // reverse index, built on first type view
    shownType: null,   // type displayed in place of the selected node's detail
    shownSection: null, // documentation section displayed in its place
    tab: "tree"        // place in the left column the reader last chose
  };

  function singleFile() {
    // The inlined model is what makes this one document, and that decides both
    // how it is addressed and which links it may offer. The question is put to
    // the document rather than kept in `state`, because `parseLocation` runs
    // before there is a model to record it in.
    return document.getElementById(MODEL_ELEMENT) !== null;
  }

  function segmentsOf(rest) {
    return rest.split("/").filter(function (s) { return s.length > 0; });
  }

  function parseLocation() {
    var pathname = decodeURIComponent(window.location.pathname);
    var index = pathname.indexOf(TREE_SEGMENT);
    if (index === -1) {
      // One file is opened under its own name, so its path says nothing about
      // where the reader is; the fragment carries that instead. An absent
      // fragment is the root of the tree rather than a 404 — there is no other
      // document here that could have been meant.
      if (!singleFile()) return null;
      var fragment = decodeURIComponent(window.location.hash.slice(1));
      var at = fragment.indexOf(TREE_SEGMENT);
      return {
        root: ".",
        segments: at === -1 ? [] : segmentsOf(fragment.slice(at + TREE_SEGMENT.length))
      };
    }
    return {
      root: pathname.slice(0, index),
      segments: segmentsOf(pathname.slice(index + TREE_SEGMENT.length))
    };
  }

  function declaration(node) {
    return state.model.declarations[node.d] || {};
  }

  function childrenOf(node) {
    return node.children || [];
  }

  function indexTree() {
    // Paths are built once so selection and expansion are lookups rather than
    // repeated walks. Only the path string is stored, not a copy of the node.
    state.nodeByPath = new Map();
    var root = state.model.tree;
    if (!root) return;
    var stack = [[root, []]];
    while (stack.length) {
      var item = stack.pop();
      var node = item[0];
      var path = item[1];
      // Where two elements share a path — 860 of them do, through the
      // branches of a choice — the first one found wins.
      var key = path.join("/");
      if (!state.nodeByPath.has(key)) {
        state.nodeByPath.set(key, node);
      }
      var children = childrenOf(node);
      for (var i = children.length - 1; i >= 0; i--) {
        // A group has no instance path: its members sit at the parent's level.
        stack.push([children[i], path.concat(declaration(children[i]).name || "?")]);
      }
    }
  }

  function expandAncestors(segments) {
    state.expanded = state.expanded || new Set();
    state.expanded.add("");
    for (var i = 1; i <= segments.length; i++) {
      state.expanded.add(segments.slice(0, i).join("/"));
    }
  }

  // "sequence" and "all" are schema words for a distinction that matters to
  // anyone writing an instance: whether the children have to appear in the
  // given order. Spelling it out is worth more than the vocabulary term.
  // The schema word carries the row; the explanation appears on hover and
  // focus, so the table stays quiet for readers who know the vocabulary.
  var COMPOSITOR_GLOSS = {
    sequence: "The children below must appear in exactly this order. "
      + "Each may repeat as often as its own occurrence allows.",
    all: "The children below may appear in any order. Each may appear at most once.",
    choice: "Exactly one of the alternatives below may appear, "
      + "unless the occurrence next to this line says otherwise."
  };

  function compositorGloss(name) {
    return COMPOSITOR_GLOSS[name] || "";
  }

  /* ---- identity constraints ----
   *
   * A key, a reference to one, or a uniqueness rule. They hang off the
   * declaration rather than off the type, so they belong to the node and not
   * to a type page — which is also why the static pages do not carry them:
   * there is no page for an element in this architecture, and the type is not
   * where the rule was written.
   */
  var IDENTITY_GLOSS = {
    key: "Each element the selector picks must carry these fields, and each "
      + "combination of them may appear only once.",
    keyref: "These fields must match a key declared elsewhere, the one named "
      + "beside them.",
    unique: "Among the elements the selector picks, each combination of these "
      + "fields may appear only once."
  };

  function identityTerm(rule) {
    var term = element("span", "cd-facet", rule.kind);
    term.setAttribute("tabindex", "0");
    var tip = element("span", "cd-tip", IDENTITY_GLOSS[rule.kind] || "");
    tip.setAttribute("role", "note");
    term.appendChild(tip);
    return term;
  }

  function appendIdentity(panel, decl) {
    appendTable(panel, "Identity constraints", decl.identityConstraints, [
      { head: "Constraint", cell: identityTerm },
      { head: "Name", cell: function (r) { return text(r.name || "", "code"); } },
      { head: "Refers to", cell: function (r) { return text(r.refer || "", "code"); } },
      { head: "Selector", cell: function (r) { return text(r.selector || "", "code"); } },
      { head: "Fields", cell: function (r) {
          return text((r.fields || []).join(", "), "code"); } }
    ]);
  }

  // The one construct in the child table that is neither an element nor a
  // group: a place where the schema allows what it does not name.
  var ANY_GLOSS = "An element the schema does not name may appear here. The namespace beside it says which are allowed; strict means the element must be declared in a schema of its own.";

  // The same reading of the same words as the type pages give. Two copies of
  // the prose, as with the compositors above: the generator writes the pages in
  // Python and the viewer builds its panel here.
  var UNION_GLOSS = "A value must be valid against one of these types. Any one of them is enough, and the instance does not say which one was meant.";

  var FACET_GLOSS = {
    minInclusive: "The value must be this or greater.",
    maxInclusive: "The value must be this or less.",
    minExclusive: "The value must be greater than this.",
    maxExclusive: "The value must be less than this.",
    pattern: "The value must match this regular expression.",
    length: "The value must be exactly this long.",
    minLength: "The value must be at least this long.",
    maxLength: "The value must be at most this long.",
    totalDigits: "The value must have at most this many digits in all.",
    fractionDigits: "The value must have at most this many digits after the point.",
    whiteSpace: "How whitespace is treated before the value is checked."
  };

  function facetTerm(facet) {
    var term = element("span", "cd-facet", facet.name);
    term.setAttribute("tabindex", "0");
    var tip = element("span", "cd-tip", FACET_GLOSS[facet.name] || "");
    tip.setAttribute("role", "note");
    term.appendChild(tip);
    return term;
  }

  // The bounds themselves, exact for any pair the schema can hold. Always
  // shown, and always first: a reader who knows the notation takes it in
  // faster than a sentence, and it is the part that cannot run out of words.
  function notation(decl) {
    var max = bound(decl.maxOccurs);
    return "[" + bound(decl.minOccurs) + ".." + (max === null ? "\u221E" : max) + "]";
  }

  function bound(value) {
    return value === undefined ? 1 : value;
  }

  function occursOnce(decl) {
    return bound(decl.minOccurs) === 1 && bound(decl.maxOccurs) === 1;
  }

  // The same words the generator writes into the pages. Two implementations of
  // one vocabulary, as with the glosses above: the pages are built in Python
  // and this panel here.
  function occurrenceWords(decl) {
    var min = bound(decl.minOccurs);
    var max = bound(decl.maxOccurs);
    // Nothing plain to say about a bound that forbids the element.
    if (max !== null && (max < min || max === 0)) return "";
    if (max === null) {
      if (min === 0) return "any number";
      return min === 1 ? "one or more" : min + " or more";
    }
    if (min === max) return min === 1 ? "required" : "exactly " + min;
    if (min === 0) return max === 1 ? "optional" : "up to " + max;
    return min + " to " + max;
  }

  // Bounds first, then the reading of them where there is one.
  function occurrenceCell(decl) {
    var cell = element("span");
    cell.appendChild(element("span", "cd-bounds", notation(decl)));
    var words = occurrenceWords(decl);
    if (words) cell.appendChild(document.createTextNode(" " + words));
    return cell;
  }

  function times(count) {
    if (count === 1) return "once";
    if (count === 2) return "twice";
    return count + " times";
  }

  // A whole sentence, because the node line is read rather than scanned, and
  // because "occurs 1" read as a count of what is in a dataset instead of what
  // the schema permits. The modal is the part that says it is a rule.
  function occurrenceSentence(decl) {
    var min = bound(decl.minOccurs);
    var max = bound(decl.maxOccurs);
    if (max !== null && (max < min || max === 0)) return "";
    var modal = min >= 1 ? "must appear " : "may appear ";
    if (max === null) {
      return modal + (min === 0 ? "any number of times" : "at least " + times(min));
    }
    if (min === max) return modal + "exactly " + times(min);
    if (min === 0) return modal + "at most " + times(max);
    return modal + "between " + min + " and " + max + " times";
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderTree() {
    var container = document.getElementById("cd-tree");
    // Read before the rebuild: the row holding focus is about to be destroyed,
    // and the cursor may only take the focus back if the reader was in the
    // tree to begin with — a click or the initial load must not steal it.
    var hadFocus = container.contains(document.activeElement);
    container.textContent = "";
    state.rows = [];
    state.cursorIndex = null;
    var root = state.model.tree;
    if (!root) {
      container.appendChild(element("p", "cd-empty", "The model contains no tree."));
      return;
    }
    // The pane is the tab panel; the tree proper is inside it, so the rows
    // have something that owns them either way.
    var group = element("div", "cd-treeroot");
    group.setAttribute("role", "tree");
    group.setAttribute("aria-label", "Instance tree");
    group.appendChild(renderNode(root, [], 0, 1, 1));
    container.appendChild(group);
    restoreCursor(hadFocus);
  }

  function renderNode(node, path, depth, position, total) {
    var decl = declaration(node);
    var key = path.join("/");
    var children = childrenOf(node);
    var isExpanded = state.expanded.has(key);
    var isSelected = key === state.path.join("/");

    var min = decl.minOccurs === undefined ? 1 : decl.minOccurs;
    var max = decl.maxOccurs === undefined ? 1 : decl.maxOccurs;
    var classes = ["cd-node", min === 0 ? "cd-optional" : "cd-required"];
    if (max === null || max > 1) classes.push("cd-repeatable");
    if (isSelected) classes.push("cd-selected");

    var item = element("div", classes.join(" "));
    item.style.paddingLeft = depth * 16 + "px";
    // The tree is flat in the DOM as it is on screen (decision 0008): every row
    // states its own place in the hierarchy instead of being wrapped in nested
    // groups. The row itself is the treeitem, and the cursor row is the only
    // tab stop, so entering the tree costs one Tab and not two per row.
    item.setAttribute("role", "treeitem");
    item.setAttribute("aria-level", String(depth + 1));
    item.setAttribute("aria-posinset", String(position));
    item.setAttribute("aria-setsize", String(total));
    item.setAttribute("aria-selected", String(isSelected));
    if (children.length) item.setAttribute("aria-expanded", String(isExpanded));
    item.tabIndex = -1;

    var toggle = element("button", "cd-toggle", children.length ? (isExpanded ? "\u2212" : "+") : "\u00B7");
    toggle.disabled = children.length === 0;
    // The row carries aria-expanded now, and the toggle repeats nothing: it
    // stays reachable with the pointer and out of the keyboard's way.
    toggle.tabIndex = -1;
    toggle.setAttribute("aria-hidden", "true");
    toggle.addEventListener("click", function (event) {
      event.stopPropagation();
      if (isExpanded) state.expanded.delete(key); else state.expanded.add(key);
      state.cursor = path;
      renderTree();
    });
    item.appendChild(toggle);

    var label = element("button", "cd-label");
    label.tabIndex = -1;
    // The name and nothing else. Every row but the root carried its bounds —
    // 33,724 of them `0..1` and 18,012 a bare `1`, so 95 % of the 54,551 said
    // either "optional" or "exactly one" in a notation a newcomer meets here
    // for the first time. It is the panel's business, where there is room to
    // say it in words; the tree is a list of names to find things in.
    label.appendChild(element("span", "cd-name", decl.name || "?"));
    if (decl.alternative) {
      // The tree stays flat; the constraint rides on the node it applies to.
      // What the mark means is said in the legend under the `?` and no
      // longer in a tip hanging off the row. An absolutely positioned box
      // belongs to the pane's scrollable area whether or not it is on
      // screen, and five of them in the smallest schema there is raised
      // both scrollbars over a tree that fits: 272px of scroll height
      // against 219 of pane. The pane clips as it scrolls, so the one tip
      // a reader did open was cut off at its edge — 53px below it at the
      // default width, 180 past its right at half that.
      label.appendChild(element("span", "cd-alternative", "\u2442"));
    }
    // The type name is not repeated here: for most nodes it merely echoes the
    // element name, and the detail panel states it precisely.
    label.addEventListener("click", function () { select(path); });
    item.appendChild(label);

    state.rows.push({
      key: key,
      path: path,
      depth: depth,
      element: item,
      hasChildren: children.length > 0,
      expanded: isExpanded
    });

    var wrapper = element("div", "cd-subtree");
    // The wrapper only holds a row together with its subtree and means nothing
    // of its own, so it is skipped when the tree's items are computed.
    wrapper.setAttribute("role", "none");
    wrapper.appendChild(item);

    if (isExpanded) {
      for (var i = 0; i < children.length; i++) {
        var childName = declaration(children[i]).name || "?";
        wrapper.appendChild(renderNode(
          children[i], path.concat(childName), depth + 1, i + 1, children.length
        ));
      }
    }
    return wrapper;
  }

  /* ---- keyboard (F1, N13) ----
   *
   * The cursor is where the keyboard points; the selection is what the detail
   * panel shows and what the URL names. The two are usually the same row and
   * need not be: arrow keys move the cursor alone, Space and Enter commit it.
   * Were every arrow key to select, each keystroke would push a history entry
   * and the browser's back button would be useless after a few rows.
   *
   * Movement itself does not re-render. `renderTree()` rebuilds the container
   * from scratch, which is right for expanding and collapsing and far too much
   * for a step from one row to the next: that is two attribute changes.
   */

  function moveCursor(index, focusRow) {
    if (!state.rows.length) return;
    index = Math.max(0, Math.min(index, state.rows.length - 1));
    var previous = state.rows[state.cursorIndex];
    if (previous) {
      previous.element.classList.remove("cd-cursor");
      previous.element.tabIndex = -1;
    }
    var row = state.rows[index];
    state.cursorIndex = index;
    state.cursor = row.path;
    row.element.classList.add("cd-cursor");
    row.element.tabIndex = 0;
    if (focusRow === false) return;
    row.element.focus();
    if (row.element.scrollIntoView) row.element.scrollIntoView({ block: "nearest" });
  }

  function indexForPath(path) {
    // Where two rows share a path — 860 do, through the branches of a choice —
    // the first one wins, as it does in `indexTree()`. A cursor whose row is
    // gone, because an ancestor was collapsed, falls back to that ancestor.
    var segments = (path || []).slice();
    for (;;) {
      var key = segments.join("/");
      for (var i = 0; i < state.rows.length; i++) {
        if (state.rows[i].key === key) return i;
      }
      if (!segments.length) return 0;
      segments.pop();
    }
  }

  function restoreCursor(focusRow) {
    if (!state.rows.length) return;
    moveCursor(indexForPath(state.cursor), focusRow);
  }

  function focusCursor() {
    var row = state.rows[state.cursorIndex];
    if (!row) return;
    row.element.focus();
    if (row.element.scrollIntoView) row.element.scrollIntoView({ block: "nearest" });
  }

  function focusDetail() {
    var panel = document.getElementById("cd-detail");
    if (!panel) return;
    panel.focus();
    if (panel.scrollTo) panel.scrollTo(0, 0);
  }

  // The whole panel, not the element Enter leaves the focus on: a reader who
  // has tabbed on to a link inside it is still in the panel, and 0018 settled
  // that the way back may not depend on which of those two states he is in.
  function inDetail(node) {
    var panel = document.getElementById("cd-detail");
    return !!panel && !!node && panel.contains(node);
  }

  // The cursor lives in the tree pane, and focusing a row of a hidden pane
  // focuses nothing — so the Handbook has to be put away before the cursor is
  // asked for.
  function backToTree() {
    if (docsAreOpen()) showPane("tree");
    focusCursor();
  }

  function parentIndex(index) {
    var depth = state.rows[index].depth;
    for (var i = index - 1; i >= 0; i--) {
      if (state.rows[i].depth < depth) return i;
    }
    return index;
  }

  function setupTreeKeys() {
    var container = document.getElementById("cd-tree");
    if (!container) return;
    // One listener on the container, not one per row: the rows are rebuilt on
    // every expansion, and there are up to 54,552 of them.
    container.addEventListener("keydown", function (event) {
      // Alt+Left is the browser's back and Ctrl+Home the document start: the
      // tree does not take keys that carry a modifier.
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      var index = state.cursorIndex;
      var row = state.rows[index];
      if (!row) return;
      hintStart();

      if (event.key === "ArrowDown") {
        moveCursor(index + 1);
      } else if (event.key === "ArrowUp") {
        moveCursor(index - 1);
      } else if (event.key === "Home") {
        moveCursor(0);
      } else if (event.key === "End") {
        moveCursor(state.rows.length - 1);
      } else if (event.key === "ArrowRight") {
        // Open what is closed, then step inward: the first child is the next
        // row, because the rows are held in the order they are drawn.
        if (row.hasChildren && !row.expanded) {
          state.expanded.add(row.key);
          renderTree();
        } else if (row.hasChildren) {
          moveCursor(index + 1);
        }
      } else if (event.key === "ArrowLeft") {
        if (row.expanded) {
          state.expanded.delete(row.key);
          renderTree();
        } else {
          moveCursor(parentIndex(index));
        }
      } else if (event.key === " " || event.key === "Spacebar") {
        select(row.path);
      } else if (event.key === "Enter") {
        select(row.path);
        focusDetail();
      } else {
        return;
      }
      event.preventDefault();
    });
  }

  /* ---- the keyboard hint ----
   *
   * The tree is the one control here whose keys cannot be read off it, and a
   * reader who never presses one never learns they exist. So it is said once,
   * quietly, and taken back the moment it is no longer news — the first key in
   * the tree, or the button. Remembered like the tree width; the reader who
   * has moved a cursor once does not need telling again.
   */
  var HINT_KEY = "cpacs-doc.keyboardHint";
  // Two lines, because the column holds two things a reader cannot read off
  // the screen: the tree's keys, and what the field accepts. The forms were a
  // `title` on the field and a note under the chips that only a reader who
  // had already narrowed by hand ever saw; this is where someone looks.
  // The fourth entry is the tab the line is about. It is named rather than
  // derived from the label, so renaming one does not silently unmark the other.
  // The other half of what cannot be read off the tree. The keys are one
  // half; these are the marks — a glyph and two weights of one name — and
  // they are as unguessable, which is why they were on hover and why hover
  // was the wrong place: it explains one row at a time, to whoever already
  // suspected there was something to explain.
  //
  // It stands in the table the `?` opens and never in the opening, which is
  // one line to glance at and would become the legend it replaced. Directly
  // after the keys, so that the rule between the two lines has something on
  // both sides: with the Search group in between, that rule was suppressed by
  // `.cd-hint-line[hidden] + .cd-hint-line` — correctly, and invisibly.
  //
  // Drawn in the tree's own classes rather than in copies of its rules, so
  // that restyling the tree restyles the legend with it. Each entry names
  // the shell it is drawn in and, where the tree puts the name inside one,
  // the inner class: `.cd-required .cd-name` and its optional twin are
  // descendant rules, and a bare span would miss them.
  var HINT_MARKS = ["Legend", "mark", [
    [["\u2442"], "one branch of a choice", ["cd-alternative", null]],
    [["name"], "must appear", ["cd-required", "cd-name"]],
    [["name"], "may appear", ["cd-optional", "cd-name"]]
  ], "tree"];

  var HINT_GROUPS = [
    ["", "key", [
      [["\u2191", "\u2193"], "move"],
      [["\u2192", "\u2190"], "open, close"],
      // Two keys commit the same selection and differ only in where the
      // keyboard is left standing. Nothing on the screen tells them apart, so
      // the table is the only place that can, and it takes both captions to do
      // it: "details" alone on either line would make the other redundant.
      [["Space"], "details"],
      [["Enter"], "details, and go there"],
      [["/"], "search"],
      // The way back. Enter without it strands a reader in the detail panel,
      // and the same key clears the search and closes this hint. The panel
      // keeps its own arrows, since a type page is read with them, so this is
      // the one way out — under two names, because the hand that has just
      // pressed Enter is nearer to one of them than to the other.
      [["Esc", "Backspace"], "back to the tree"]
    ], "tree"],
    HINT_MARKS,
    // A heading names what the row below it is, never where the reader is —
    // the tab above already says that. The forms are the one group whose kind
    // is not written on them: a key in relief is plainly pressed, and `type:`
    // in the code face is plainly typed only to someone who already knew. So
    // the heading is the sentence the forms finish, and every one of them is
    // in fact how a query starts.
    ["Start your search with:", "form", [
      [["type:"], "types only"],
      [["element:"], "elements only"],
      // Two spellings of one filter, said the way the tree line says two
      // arrows: the caption belongs to the pair, not to each of them.
      [["@", "attribute:"], "attributes"],
      // The slash is in the example and needs no naming beside it.
      [["wings/wing"], "paths"]
    ], "search"]
  ];


  // What the hint says the first time is not what it says when asked for.
  // The table above is a legend — six entries and nine caps — and a legend
  // asks a reader to learn five things before doing one, which is why it was
  // read past. The opening carries the two keys that get anyone moving and
  // points at the `?` for the rest. Written as a group of its own rather than
  // sliced out of the table, so that shortening one does not quietly shorten
  // the other.
  //
  // An entry with no keys is prose: the `?` is a button in the strip, not a
  // key, and setting it in relief would promise a keystroke that does nothing.
  //
  // It has to hold one line at the tree's default width, which is what makes
  // it a glance rather than a legend — 37px against the table's 65. The words
  // are short for that reason and not for terseness; a fourth entry, or a
  // longer way of saying "more under ?", puts it back on two.
  var HINT_OPENING = [
    ["Keys", "key", [
      [["↑", "↓"], "move"],
      [["Space"], "details"],
      [[], "more under ?"]
    ], "tree"]
  ];

  function hintSeen() {
    try {
      return window.localStorage.getItem(HINT_KEY) === "seen";
    } catch (e) {
      return false;  // private mode: show it, do not fail
    }
  }

  function markHelp(open) {
    var help = document.getElementById("cd-help");
    if (!help) return;
    help.setAttribute("aria-expanded", String(open));
    if (open) help.setAttribute("aria-controls", "cd-hint");
    else help.removeAttribute("aria-controls");
  }

  function hintGroupFor(tab) {
    for (var i = 0; i < HINT_GROUPS.length; i++) {
      if (HINT_GROUPS[i][3] === tab) return HINT_GROUPS[i];
    }
    return null;
  }

  // One tab, one group. The hint stands over a single pane and is read as
  // belonging to it, so lines about the other place look misplaced there.
  //
  // A tab the hint knows no keys for — the Handbook, which is read rather than
  // driven — gets no hint at all, and its `?` is disabled rather than hidden:
  // a button that vanishes and returns as the reader moves along the strip is
  // harder to place than one that is plainly not on offer here. The hint is
  // suppressed, not closed, so leaving the Handbook restores what the reader
  // had open.
  function fitHintToTab() {
    var group = hintGroupFor(state.tab);
    var help = document.getElementById("cd-help");
    if (help) {
      help.disabled = !group;
      help.title = group ? "Keys and query forms" : "No keys in the Handbook";
    }

    var hint = document.getElementById("cd-hint");
    if (!hint) return;
    // Read off the lines the box actually holds rather than off the table: the
    // opening carries the tree's line alone, and on any other tab that would
    // leave an empty box standing where a group used to be.
    var lines = hint.querySelectorAll(".cd-hint-line");
    var shown = 0;
    for (var i = 0; i < lines.length; i++) {
      var fits = !!group && lines[i].getAttribute("data-tab") === state.tab;
      lines[i].hidden = !fits;
      if (fits) shown++;
    }
    hint.hidden = !shown;
    markHelp(!!shown);
  }

  function hideHint() {
    var hint = document.getElementById("cd-hint");
    if (!hint) return;
    hint.parentNode.removeChild(hint);
    markHelp(false);
    markSeen();
  }

  function markSeen() {
    try { window.localStorage.setItem(HINT_KEY, "seen"); } catch (e) { /* private mode */ }
  }

  // The first touch of the tree brings the opening out, and a key is as much a
  // touch as a click. It used to be the opposite — a key called the opening off
  // for good, on the reading that a reader already on the arrows has nothing
  // left to be told. He has: the arrows are the guessable half, Space is not,
  // and the reader who starts on the keys is exactly the one who never clicks
  // and so was never told. Once out it stays until it is closed, for the same
  // reason: being shown the keys and having them taken away for trying one is
  // not help.
  function hintStart() {
    if (!openingPending) return;
    openingPending();
    showHint(true);
  }

  function setupHelp() {
    var help = document.getElementById("cd-help");
    if (!help) return;
    help.addEventListener("click", function () {
      if (document.getElementById("cd-hint")) hideHint();
      else showHint(false);
    });
  }

  /* Not at the door. Standing there from the first paint, the hint is part of
     the furniture and is read as little as the rest of it; it arrives instead
     at the reader's first touch of the tree, when he has just shown what he
     came for and has one question — what now.

     A click is one such touch and gets a listener here. The other is a key,
     which `setupTreeKeys` and the global arrow handler already see before
     anyone else does, so they call `hintStart` rather than the tree carrying a
     second listener for the same event. The handle is kept so that whichever
     comes first unhooks the click. */
  var openingPending = null;

  function setupHint() {
    if (hintSeen()) return;
    var tree = document.getElementById("cd-tree");
    if (!tree) return;
    openingPending = function () {
      tree.removeEventListener("click", hintStart);
      openingPending = null;
    };
    tree.addEventListener("click", hintStart);
  }

  function showHint(automatic) {
    if (document.getElementById("cd-hint")) return;
    var tree = document.getElementById("cd-tree");
    if (!tree || !tree.parentNode) return;

    var hint = element("div", "cd-hint");
    hint.id = "cd-hint";
    hint.setAttribute("role", "note");

    var groups = automatic ? HINT_OPENING : HINT_GROUPS;
    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      var line = element("div", "cd-hint-line");
      line.setAttribute("data-tab", group[3]);
      // Only a group that shares its tab with another needs naming. The tab is
      // already lit in the strip above, so a line reading "Tree" under the
      // Tree tab said nothing twice; the legend keeps its lead because it
      // stands beneath the keys and has to be told apart from them.
      if (group[0]) line.appendChild(element("span", "cd-hint-lead", group[0]));
      var entries = group[2];
      for (var i = 0; i < entries.length; i++) {
        var item = element("span", "cd-hint-item");
        var written = entries[i][0];
        for (var k = 0; k < written.length; k++) {
          if (group[1] === "mark") {
            var shell = entries[i][2];
            var drawn = element("span", shell[0]);
            if (shell[1]) drawn.appendChild(element("span", shell[1], written[k]));
            else drawn.textContent = written[k];
            item.appendChild(drawn);
          } else {
            item.appendChild(group[1] === "key"
              ? element("kbd", null, written[k])
              : element("span", "cd-hint-form", written[k]));
          }
        }
        item.appendChild(element("span", "cd-hint-what", entries[i][1]));
        line.appendChild(item);
      }
      hint.appendChild(line);
    }

    var close = element("button", "cd-hint-close", "\u00D7");
    close.setAttribute("aria-label", "Hide the keyboard hint");
    close.addEventListener("click", hideHint);
    hint.appendChild(close);

    // At the head of the column, flush under the strip: it is what the `?` in
    // the strip opens, and it outlives the pane below it, which `fitHintToTab`
    // then keeps it in step with.
    tree.parentNode.insertBefore(hint, tree);
    // Marks the button too: whether the hint is on offer at all is the same
    // question as which group it carries.
    fitHintToTab();
  }

  function isTextField(node) {
    if (!node) return false;
    return node.tagName === "INPUT" || node.tagName === "TEXTAREA"
      || node.isContentEditable === true;
  }

  function setupGlobalKeys() {
    document.addEventListener("keydown", function (event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTextField(event.target)) return;
      if (event.key === "/") {
        if (!document.getElementById("cd-search")) return;
        showPane("search");
        focusSearch();
        event.preventDefault();
        return;
      }
      // Escape does the most local thing there is to do, and the panel is
      // nearer than the hint. The hint used to come first, which was harmless
      // while it was gone at the reader's first key; since 0019 it stands
      // until it is closed, so the first Escape out of the panel closed the
      // hint and left the reader where he was — in the one state where the
      // hint's own "Esc back to the tree" was not true.
      //
      // Backspace answers wherever Escape answers, rather than only in the
      // panel: a key that works in one branch of this and not the others is
      // the "sometimes" binding 0018 took out. The text-field guard above is
      // what keeps it out of the search field, where it still deletes; and
      // `preventDefault` below covers the reader who has put the browser's
      // own back navigation back on the key.
      if (event.key === "Escape" || event.key === "Backspace") {
        if (!document.getElementById("cd-search-panel").hidden) {
          closeSearch(true);
        } else if (inDetail(event.target)) {
          backToTree();
        } else if (document.getElementById("cd-hint")) {
          hideHint();
        } else {
          backToTree();
        }
        event.preventDefault();
        return;
      }
      // Straight after a page load the focus is nowhere, and an arrow key
      // would scroll a page that does not scroll: both panes carry their own
      // scrollbar. The reader meant the tree. Only an event that reached the
      // document from the body itself qualifies — anything focused, the tree
      // included, has handled its own keys by now.
      if (event.target === document.body || event.target === document.documentElement) {
        if (event.key.indexOf("Arrow") === 0) {
          hintStart();
          focusCursor();
          event.preventDefault();
        }
      }
    });
  }

  function setupListKeys(id) {
    var panel = document.getElementById(id);
    if (!panel) return;
    panel.addEventListener("keydown", function (event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      var step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
      if (!step) return;
      // Asked of the panel rather than walked as siblings: a group's places
      // stand one level in, and a group that is closed has none on screen.
      var rows = panel.querySelectorAll(".cd-result, .cd-place");
      for (var i = 0; i < rows.length; i++) {
        if (rows[i] !== document.activeElement) continue;
        for (var j = i + step; j >= 0 && j < rows.length; j += step) {
          if (rows[j].offsetParent === null) continue;
          rows[j].focus();
          break;
        }
        event.preventDefault();
        return;
      }
    });
  }

  /* The detail panel claims no key of its own. Escape is the way back, and
     every arrow is the panel's: the type pages run past the fold and carry
     tables that scroll sideways (0014), so ← and → are how one is read, not a
     way out of it. One key back, learned once, beats two that hold only until
     the reader tabs on to a link. */

  function select(path) {
    state.shownType = null;
    state.shownSection = null;
    state.path = path;
    state.cursor = path;
    expandAncestors(path);
    // The root element is part of the URL: it is part of an instance path, and
    // the "show in tree" links on type pages are written that way.
    var segments = [declaration(state.model.tree).name].concat(path);
    var address = TREE_SEGMENT + segments.join("/") + "/";
    // The fragment is the only part of a file:// URL a page may change:
    // pushState to a path throws a SecurityError against a null origin.
    var url = singleFile() ? "#" + address : state.root + address;
    window.history.pushState({ path: path }, "", url);
    renderTree();
    renderDetail();
  }

  function withRoot(html) {
    // The empty string is a valid root — a site deployed at "/" — and yields
    // an absolute "/media/…". A relative fallback would resolve against the
    // requested tree path instead, which this file must never do.
    return html.split(ROOT_TOKEN).join(state.root);
  }

  function typeHref(typeName) {
    return state.root + "/type/" + typeName.split("/").join("--") + "/index.html";
  }

  function renderDetail() {
    var panel = document.getElementById("cd-detail");
    panel.textContent = "";

    if (state.shownSection) {
      renderSectionDetail(panel, state.shownSection);
      return;
    }

    if (state.shownType) {
      renderTypeDetail(panel, state.shownType);
      return;
    }

    var key = state.path.join("/");
    var node = state.nodeByPath.get(key);
    if (!node) {
      panel.appendChild(element("h1", null, "Not found"));
      panel.appendChild(element(
        "p", "cd-kind",
        "No element at " + (key ? "cpacs/" + key : "the requested path") + " in this schema."
      ));
      return;
    }

    var decl = declaration(node);
    panel.appendChild(renderBreadcrumb());
    panel.appendChild(element("h1", null, decl.name || "?"));

    // Plain words first, the schema's own notation behind them: the head is
    // read rather than scanned, and the reader who needs the exact form finds
    // it in the same line. Where a bound has no plain English — one that
    // forbids the element, say — the line opens with the notation instead and
    // states a fact rather than an invented phrase. The Occurrence column of
    // the tables keeps the notation in front: there it is six characters wide
    // on every row, so both parts line up in columns of their own.
    var meta = element("p", "cd-kind");
    meta.appendChild(document.createTextNode("Occurrence: "));
    var sentence = occurrenceSentence(decl);
    if (sentence) meta.appendChild(document.createTextNode(sentence + " "));
    meta.appendChild(element("span", "cd-bounds", notation(decl)));
    // Nowhere else would a reader learn it: the predecessor never wrote a
    // declared default out, and the schema is what it exists to replace.
    var declared = declaredValue(decl);
    if (declared) meta.appendChild(element("span", null, " \u00B7 " + declared));
    var type = decl.type ? state.model.types[decl.type] : null;
    // What may be written here. Usually the value the type carries; for a
    // type declared on the spot it is the base, since the synthetic name
    // says only where the declaration stands, which the breadcrumb has just
    // said.
    // Usually the value the type carries. For a type declared on the spot it
    // is the base, since the synthetic name says only where the declaration
    // stands. And where the declaration names a built-in outright — 5 nodes,
    // `header/version` among them — the type is the value: there is no type in
    // this schema to have a page, and the line below is where it belongs.
    var value = decl.type
      ? (valueType(decl.type) || (!type || type.anonymous ? typeLabel(decl.type) : ""))
      : "";
    // The type is named where its own words begin, which is the head of
    // the borrowed block below. Where it has no words to lend, that block
    // does not appear and this line names it instead — otherwise the panel
    // would name it nowhere. 568 of the 54,552 nodes are in that case, and
    // the value line below is left to say it where it says it already.
    if (decl.type && !typeProse(type) && typeLabel(decl.type) !== value) {
      meta.appendChild(document.createTextNode(" \u00B7 type "));
      meta.appendChild(typeCell(decl.type));
    }
    // How often, and what may be written: two questions, a line each, and one
    // block — the second was riding on the end of the first.
    var head = element("div", "cd-head");
    head.appendChild(meta);
    if (value) {
      var line = element("p", "cd-kind");
      line.appendChild(document.createTextNode("Value: "));
      // A built-in content type leads out to what that datatype allows; the
      // base of a type declared on the spot leads to that type's own page,
      // where its values and its citable address are (0003). Both are written
      // `xsd:...`, so which link it is has to be decided here rather than by
      // the look of the name.
      var name = valueType(decl.type) ? builtinCell(value) : typeCell(decl.type);
      var word = VALUE_WORDS[value];
      if (word) {
        line.appendChild(document.createTextNode(word + " ("));
        line.appendChild(name);
        line.appendChild(document.createTextNode(")"));
      } else {
        line.appendChild(name);
      }
      // What narrows it, where anything does: 1,199 of the 54,552 nodes, and
      // the table that spells the constraints out stands further down this
      // same panel. Named rather than counted, as the Constraints column
      // names them — `pattern` says more than "1 constraint".
      var holds = holdings(decl.type);
      if (holds) {
        line.appendChild(document.createTextNode(" \u00B7 " + holds));
      }
      head.appendChild(line);
    }
    panel.appendChild(head);

    if (decl.documentation && decl.documentation.text) {
      panel.appendChild(element("p", "cd-elementdoc", decl.documentation.text));
    }

    if (decl.type) {
      appendBorrowedProse(panel, decl.type, type);
      appendTypeTables(panel, type);
    }

    // Last, though the rule is about this element and everything above it
    // describes the type: one node of 53,692 carries one, and putting it first
    // pushed the prose down the page for every reader of the root node, which
    // is where the only rule in the schema happens to sit.
    appendIdentity(panel, decl);
  }

  // Two kinds of words meet on a node's panel: what the schema says about
  // this place, and what it says about the type standing there. They were
  // set alike, so on the 41,004 nodes carrying both, nothing said which was
  // which — and on the 12,980 carrying only the type's, a general sentence
  // read as a statement about this place. What belongs to the place stays
  // unmarked, being what the reader came for; what is borrowed says whose
  // it is. The rail is decoration only: the attribution carries it in words.
  //
  // The line labels the block; it does not announce a topic. "About the type
  // X" was read as a heading over a link — the reader clicked it to find out
  // more and swapped the panel for the type's own, which shows this same prose
  // and these same tables and adds only the derivation line, the citable page
  // and the usage list. So the click cost him the element's head and words and
  // returned three lines of metadata.
  //
  // Renaming it was not enough, and measuring the line says why: the link was
  // the strongest thing on it — 9.4 to 1 against the page where the label held
  // 8.1, underlined, in a hue of its own, and standing first — while the label
  // was 31 % smaller than the prose it introduced and so read as a caption on
  // the link rather than a heading over the block. Both are addressed here:
  // the name is plain text, and the route to the type stands after the label,
  // smaller, saying what it leads to.
  function appendBorrowedProse(panel, typeName, type) {
    if (!typeProse(type)) return;
    var borrowed = element("section", "cd-borrowed");
    var head = element("p", "cd-borrowed-head");
    // The category word first, the name after it, and the name is the link.
    // `<name> documentation` put the unknown word where the eye lands and the
    // known one at the end, so a reader running down the panel met a name he
    // did not recognise and passed the line over — and the readers who know
    // the schema best are the ones who report doing it. `Type:` is the word
    // they are looking for, and what follows it is the answer.
    //
    // `typeCell`, so this line says a type name the way every other line in
    // the viewer says one: a type absent from the schema is named and not
    // linked, which cannot arise here — a type with no entry has no prose to
    // lend — and an anonymous type is labelled with its base.
    var label = element("span", "cd-borrowed-label");
    label.appendChild(element("span", "cd-borrowed-kind", "Type:"));
    label.appendChild(document.createTextNode(" "));
    label.appendChild(typeCell(typeName));
    head.appendChild(label);
    borrowed.appendChild(head);
    appendTypeProse(borrowed, type);
    panel.appendChild(borrowed);
  }

  function typeProse(type) {
    var doc = type && type.documentation;
    return !!(doc && (doc.summaryHtml || doc.remarksHtml));
  }

  function appendTypeProse(panel, type) {
    if (!type || !type.documentation) return;
    // The fragments were rendered once, by the generator. Inserting them
    // here keeps one implementation of the ddue vocabulary.
    if (type.documentation.summaryHtml) {
      var summary = element("div", "cd-summary");
      summary.innerHTML = withRoot(type.documentation.summaryHtml);
      panel.appendChild(summary);
    }
    if (type.documentation.remarksHtml) {
      var remarks = element("div", "cd-remarks");
      remarks.innerHTML = withRoot(type.documentation.remarksHtml);
      panel.appendChild(remarks);
    }
  }

  // The type's own panel: all of it is the type's, so none of it is marked.
  function appendTypeBody(panel, type) {
    appendTypeProse(panel, type);
    appendTypeTables(panel, type);
  }

  function appendTypeTables(panel, type) {
      if (type) {
        // The detail panel carries the same tables as the static type page.
        // Attributes appear nowhere else in the viewer, and repeating the
        // children costs little next to having to read them off the tree.
        appendTable(panel, "Attributes", type.attributes, [
          { head: "Name", cell: function (a) { return text("@" + a.name, "code"); } },
          { head: "Type", cell: function (a) { return typeCell(a.type); } },
          { head: "Constraints", cell: constraintsCell },
          { head: "Use", cell: function (a) { return text(a.use || ""); } },
          { head: "Default", cell: valueCell },
          { head: "Description", cell: function (a) { return text(documentationText(a)); } }
        ]);
        appendChildTable(panel, type.children);
        appendUnion(panel, type.union);
        appendTable(panel, "Value constraints", type.facets, [
          { head: "Constraint", cell: facetTerm },
          { head: "Value", cell: function (f) { return text(f.value, "code"); } }
        ]);
        appendTable(panel, "Allowed values", type.enumeration, [
          { head: "Value", cell: function (v) { return text(v.value, "code"); } },
          { head: "Description", cell: function (v) { return text(documentationText(v)); } }
        ]);
      }
  }

  // A default is what an instance means by leaving the element out; a fixed
  // value is the only one it may write. The schema's own word says which.
  function declaredValue(entry) {
    if (entry.fixed !== undefined && entry.fixed !== null) return "fixed " + entry.fixed;
    if (entry["default"] !== undefined && entry["default"] !== null) {
      return "default " + entry["default"];
    }
    return "";
  }

  // The same value under a heading that already names it. Saying "default" in
  // a column headed Default says it twice; a fixed value still needs its mark,
  // because it is not a default.
  function valueCell(entry) {
    var cell = element("span");
    if (entry.fixed !== undefined && entry.fixed !== null) {
      cell.appendChild(element("code", null, entry.fixed));
      cell.appendChild(element("span", "cd-fixed", " fixed"));
    } else if (entry["default"] !== undefined && entry["default"] !== null) {
      cell.appendChild(element("code", null, entry["default"]));
    }
    return cell;
  }

  function documentationText(entry) {
    return (entry.documentation && entry.documentation.text) || "";
  }

  function text(value, tag, className) {
    return element(tag || "span", className || null, value);
  }

  // What a type holds that its name does not show. The count says there is
  // something to open and names the section it leads to; children are left out
  // because nearly every type has some.
  // The members of a union, under a heading that carries the schema word.
  // The values are in the members, one link on, which is what the table shows.
  function appendUnion(panel, union) {
    if (!union || !union.length) return;
    var head = element("h2", null, "Allowed types ");
    var term = element("span", "cd-facet", "union");
    term.setAttribute("tabindex", "0");
    var tip = element("span", "cd-tip", UNION_GLOSS);
    tip.setAttribute("role", "note");
    term.appendChild(tip);
    head.appendChild(term);
    panel.appendChild(head);
    appendTable(panel, "", union, [
      { head: "Type", cell: function (name) { return typeCell(name); } },
      { head: "Constraints", cell: function (name) { return constraintsCell({ type: name }); } }
    ]);
  }

  function holdings(typeName) {
    var type = state.model.types[typeName];
    if (!type) return "";
    var parts = [];
    var values = (type.enumeration || []).length;
    if (values) parts.push(values + (values === 1 ? " value" : " values"));
    // A union holds neither values nor facets: without this the row that
    // points at one looks like a plain string with nothing behind it.
    var members = (type.union || []).length;
    if (members) parts.push("one of " + members + " types");
    var seen = {};
    (type.facets || []).forEach(function (facet) {
      if (seen[facet.name]) return;
      seen[facet.name] = true;
      parts.push(facet.name);
    });
    return parts.join(", ");
  }

  // Linked like the type beside it, and to the same page: a reader who does
  // not yet know that a type name is where the values live follows the words
  // that name them.
  function constraintsCell(entry) {
    var holds = holdings(entry.type);
    if (!holds) return element("span");
    var button = element("button", "cd-holds cd-crumb", holds);
    button.addEventListener("click", function () { showType(entry.type); });
    return button;
  }

  // What an instance writes there, in words a reader of the schema need not
  // have met before. Only for the datatypes a short phrase states exactly —
  // and it is a gloss, never a replacement: the name stays, carries the link
  // and is what a validator, TiXI or an error message will say. Nothing is
  // written for a type whose plain word would promise more than it holds.
  var VALUE_WORDS = {
    "xsd:string": "text",
    "xsd:double": "decimal number",
    "xsd:integer": "whole number",
    "xsd:boolean": "true or false",
    "xsd:ID": "unique identifier",
    "xsd:IDREF": "reference to an identifier",
    "xsd:date": "date",
    "xsd:time": "time of day",
    "xsd:dateTime": "date and time"
  };

  // The built-in types of XSD 1.0, each checked to answer on 2026-08-30, with
  // the name keeping its capitals in the address as it does in the schema. A
  // name that is not among them stays text: an address derived for it would be
  // a guess, and a dead link is worse than a word. The same list stands in
  // generator.py, which writes the static pages.
  var BUILTIN_REFERENCE = "https://www.datypic.com/sc/xsd/t-xsd_";
  var BUILTIN_DOCUMENTED = ("anyType anySimpleType string boolean decimal float "
    + "double duration dateTime time date gYearMonth gYear gMonthDay gDay "
    + "gMonth hexBinary base64Binary anyURI QName NOTATION normalizedString "
    + "token language NMTOKEN NMTOKENS Name NCName ID IDREF IDREFS ENTITY "
    + "ENTITIES integer nonPositiveInteger negativeInteger long int short byte "
    + "nonNegativeInteger unsignedLong unsignedInt unsignedShort unsignedByte "
    + "positiveInteger").split(" ");

  // It leaves the documentation, so it opens in a tab of its own rather than
  // taking the reader's place in the tree with it.
  function builtinCell(typeName) {
    var name = element("code", null, typeName || "");
    var local = typeName && typeName.indexOf("xsd:") === 0
      ? typeName.slice(4) : "";
    if (!local || BUILTIN_DOCUMENTED.indexOf(local) === -1) return name;
    var link = element("a", "cd-builtin");
    link.href = BUILTIN_REFERENCE + local + ".html";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.appendChild(name);
    return link;
  }

  function typeCell(typeName) {
    if (!typeName || typeName.indexOf("xsd:") === 0) {
      return builtinCell(typeName);
    }
    var type = state.model.types[typeName];
    if (!type) {
      // Not in this schema: leave the name as text rather than link nowhere.
      return element("code", null, typeName);
    }
    var label = typeLabel(typeName);
    // Switching the panel rather than following a link keeps the tree, and its
    // selection, in place. Where a type is worth citing, the panel offers the
    // static page explicitly.
    var button = element("button", "cd-crumb");
    button.appendChild(element("code", null, label));
    button.addEventListener("click", function () { showType(typeName); });
    return button;
  }

  // An anonymous type is labelled with its base: its synthetic name says where
  // it was declared, which the row it sits in has just said, while the base
  // says what may be written there. The values are one click away.
  function typeLabel(typeName) {
    var type = state.model.types[typeName];
    return type && type.anonymous && type.base ? type.base : typeName;
  }

  // What an instance writes into the element, where the label does not already
  // say it. The chain that answers it runs three types deep in this schema, and
  // following it was left to the reader.
  function valueType(typeName) {
    var type = state.model.types[typeName];
    if (!type || !type.contentType) return "";
    return type.contentType === typeLabel(typeName) ? "" : type.contentType;
  }

  function showType(typeName) {
    state.shownType = typeName;
    renderDetail();
    var panel = document.getElementById("cd-detail");
    if (panel && panel.scrollTo) panel.scrollTo(0, 0);
  }

  function childCell(child) {
    // A child leads back into the tree; a type leads out to its page.
    var button = element("button", "cd-crumb");
    button.appendChild(element("code", null, child.name));
    button.addEventListener("click", function () { select(state.path.concat(child.name)); });
    return button;
  }

  function appendChildTable(panel, members) {
    if (!members || !members.length) return;
    panel.appendChild(element("h2", null, "Child elements"));
    var table = element("table");
    var head = element("tr");
    var headings = ["Name", "Type", "Constraints", "Occurrence", "Default", "Description"];
    for (var h = 0; h < headings.length; h++) {
      var cell = element("th", null, headings[h]);
      if (headings[h] === "Occurrence") occurrenceNote(cell);
      head.appendChild(cell);
    }
    table.appendChild(head);
    appendChildRows(table, members, 0);
    panel.appendChild(table);
  }

  // The column says how often in words; the schema says it in two attributes,
  // and a reader with the schema open needs the bridge between them.
  function occurrenceNote(cell) {
    cell.textContent = "";
    var term = element("span", "cd-note-term", "Occurrence");
    term.setAttribute("tabindex", "0");
    var tip = element("span", "cd-tip", "How often the element may appear at this"
      + " place. The schema writes it as minOccurs and maxOccurs on the"
      + " declaration.");
    tip.setAttribute("role", "note");
    term.appendChild(tip);
    cell.appendChild(term);
  }

  // A compositor governs a set of children, not each child on its own, so it
  // heads them as a row of its own instead of repeating in a column.
  function appendChildRows(table, members, depth) {
    for (var i = 0; i < members.length; i++) {
      var member = members[i];
      if (member.kind === "group") {
        var groupRow = element("tr", "cd-group cd-group-" + (member.compositor || ""));
        var groupCell = element("td");
        groupCell.setAttribute("colspan", "5");
        indent(groupCell, depth);
        var label = element("span", "cd-group-label");
        var mark = element("span", "cd-group-mark");
        mark.setAttribute("aria-hidden", "true");
        label.appendChild(mark);

        var term = element("span", "cd-group-term", member.compositor || "");
        // Focusable so the explanation is reachable without a pointer.
        term.setAttribute("tabindex", "0");
        var tip = element("span", "cd-tip", compositorGloss(member.compositor));
        tip.setAttribute("role", "note");
        term.appendChild(tip);
        label.appendChild(term);

        if (!occursOnce(member)) {
          var occurs = element("span", "cd-group-occurs", "\u00B7 ");
          occurs.appendChild(occurrenceCell(member));
          label.appendChild(occurs);
        }
        groupCell.appendChild(label);
        groupRow.appendChild(groupCell);
        groupRow.appendChild(element("td"));
        table.appendChild(groupRow);
        appendChildRows(table, member.members || [], depth + 1);
        continue;
      }
      var row = element("tr");
      var nameCell = element("td");
      indent(nameCell, depth);
      if (member.kind === "any") {
        // No name and no type of its own, so the row says what it does allow.
        var term = element("span", "cd-facet", "any");
        term.setAttribute("tabindex", "0");
        var note = element("span", "cd-tip", ANY_GLOSS);
        note.setAttribute("role", "note");
        term.appendChild(note);
        nameCell.appendChild(term);
        row.appendChild(nameCell);
        row.appendChild(text(member.namespace || "", "td", null));
        row.appendChild(text(member.processContents || "", "td", "cd-inherited"));
        var occursCell = element("td", "cd-occurs");
        occursCell.appendChild(occurrenceCell(member));
        row.appendChild(occursCell);
        row.appendChild(element("td"));
        row.appendChild(text(documentationText(member), "td"));
        table.appendChild(row);
        continue;
      }
      nameCell.appendChild(childCell(member));
      row.appendChild(nameCell);
      var typeCellNode = element("td");
      typeCellNode.appendChild(typeCell(member.type));
      row.appendChild(typeCellNode);
      var holdsTd = element("td");
      holdsTd.appendChild(constraintsCell(member));
      row.appendChild(holdsTd);
      var cell = element("td", "cd-occurs");
      cell.appendChild(occurrenceCell(member));
      row.appendChild(cell);
      var valueTd = element("td");
      valueTd.appendChild(valueCell(member));
      row.appendChild(valueTd);
      row.appendChild(text(documentationText(member), "td"));
      table.appendChild(row);
    }
  }

  function indent(cell, depth) {
    if (!depth) return;
    cell.className = "cd-indent";
    cell.style.setProperty("--depth", String(depth));
  }

  function appendTable(panel, heading, rows, columns) {
    if (!rows || !rows.length) return;
    if (heading) panel.appendChild(element("h2", null, heading));
    var table = element("table");
    var head = element("tr");
    for (var c = 0; c < columns.length; c++) {
      head.appendChild(element("th", null, columns[c].head));
    }
    table.appendChild(head);
    for (var r = 0; r < rows.length; r++) {
      var row = element("tr");
      for (var i = 0; i < columns.length; i++) {
        var cell = element("td");
        cell.appendChild(columns[i].cell(rows[r]));
        row.appendChild(cell);
      }
      table.appendChild(row);
    }
    panel.appendChild(table);
  }

  function renderTypeDetail(panel, typeName) {
    var type = state.model.types[typeName] || {};

    var nav = element("nav", "cd-breadcrumb");
    var back = element("button", "cd-crumb", "\u2190 back to " + (state.path.length
      ? state.path[state.path.length - 1]
      : declaration(state.model.tree).name));
    // Always back to the selected node, never through the chain of type jumps:
    // the tree node is where the reader was, the types are a detour.
    back.addEventListener("click", function () { select(state.path); });
    nav.appendChild(back);
    panel.appendChild(nav);

    panel.appendChild(element("h1", null, typeName));

    var meta = element("p", "cd-kind");
    meta.appendChild(element("span", null, type.kind || "type"));
    if (type.base) {
      meta.appendChild(document.createTextNode(" \u00B7 " + (type.derivation || "derives from") + " "));
      meta.appendChild(typeCell(type.base));
    }
    if (type.contentType && type.contentType !== type.base) {
      meta.appendChild(document.createTextNode(" \u00B7 value "));
      meta.appendChild(builtinCell(type.contentType));
    }
    if (type.compositor) {
      meta.appendChild(document.createTextNode(" \u00B7 " + type.compositor));
    }
    // Nothing to cite when the documentation is one file: the pages the
    // link would reach are not written in that form.
    if (!singleFile()) {
      meta.appendChild(document.createTextNode(" \u00B7 "));
      var page = element("a", null, "citable page");
      page.href = typeHref(typeName);
      meta.appendChild(page);
    }
    panel.appendChild(meta);

    appendTypeBody(panel, type);
    appendUsage(panel, typeName);
  }

  function renderSectionDetail(panel, slug) {
    var section = sectionBySlug(slug);
    if (!section) {
      panel.appendChild(element("h1", null, "Not found"));
      panel.appendChild(element("p", "cd-kind", "No section at " + slug + "."));
      return;
    }

    var nav = element("nav", "cd-breadcrumb");
    var back = element("button", "cd-crumb", "\u2190 back to the tree");
    back.addEventListener("click", function () {
      state.shownSection = null;
      showPane("tree");
      select(state.path);
    });
    nav.appendChild(back);
    panel.appendChild(nav);

    panel.appendChild(element("h1", null, section.title));

    if (!singleFile()) {
      var meta = element("p", "cd-kind");
      var page = element("a", null, "citable page");
      page.href = state.root + "/doc/" + section.slug + "/index.html";
      meta.appendChild(page);
      panel.appendChild(meta);
    }

    var body = element("div", "cd-remarks");
    // Rendered once, by the generator, as everything else here is.
    body.innerHTML = withRoot(section.html);
    panel.appendChild(body);
  }

  /* ---- who uses a type ----
   *
   * Derived here rather than carried in the model, for the reason 0009 gives
   * about the search: both facts are in the model already — the references in
   * every type's children and attributes, the occurrences in the tree — and a
   * second copy would be 8.3 MB of instance paths to keep in step. Built on
   * the first type view, as the search index is built on the first keystroke.
   */
  var USAGE_LIMIT = 25;

  function usageIndex() {
    if (state.usage) return state.usage;
    var users = {};
    var types = state.model.types;
    Object.keys(types).forEach(function (name) {
      var entry = types[name];
      var stack = (entry.children || []).slice();
      while (stack.length) {
        var member = stack.pop();
        if (member.kind === "group") {
          var group = member.members || [];
          for (var g = 0; g < group.length; g++) stack.push(group[g]);
          continue;
        }
        if (member.kind === "any" || !member.type) continue;
        (users[member.type] = users[member.type] || []).push([name, member.name]);
      }
      (entry.attributes || []).forEach(function (attribute) {
        if (!attribute.type) return;
        (users[attribute.type] = users[attribute.type] || [])
          .push([name, "@" + attribute.name]);
      });
    });

    // The tree itself, not `nodeByPath`: that map holds one node per distinct
    // path and drops the 860 that repeat, and what is counted here is
    // occurrences, which is what the pages count too. The paths are kept up
    // to the cap, because where a type stands in a document is the answer a
    // reader wants first.
    var paths = {};
    var counts = {};
    var nodes = state.model.tree ? [[state.model.tree, ""]] : [];
    while (nodes.length) {
      var item = nodes.pop();
      var node = item[0];
      var decl = declaration(node);
      var here = item[1] ? item[1] + "/" + (decl.name || "?") : (decl.name || "?");
      if (decl.type) {
        counts[decl.type] = (counts[decl.type] || 0) + 1;
        if (!paths[decl.type]) paths[decl.type] = [];
        if (paths[decl.type].length < USAGE_LIMIT) paths[decl.type].push(here);
      }
      // Pushed in reverse so they come off in document order: the list is
      // capped, and "and N more" has to mean the ones after these.
      var children = childrenOf(node);
      for (var i = children.length - 1; i >= 0; i--) nodes.push([children[i], here]);
    }

    state.usage = { users: users, paths: paths, counts: counts };
    return state.usage;
  }

  function appendPathList(panel, paths, count) {
    var list = element("ul", "cd-usage-list");
    paths.forEach(function (path) {
      var item = element("li");
      var jump = element("button", "cd-crumb", path);
      jump.addEventListener("click", function () {
        // The walk starts at the root element, which `state.path` leaves out.
        select(path.split("/").slice(1));
      });
      item.appendChild(jump);
      list.appendChild(item);
    });
    if (count > paths.length) {
      list.appendChild(element("li", "cd-inherited",
        "and " + (count - paths.length) + " more"));
    }
    panel.appendChild(list);
  }

  function heading(text, count, word) {
    var head = element("h3", null, text + " ");
    head.appendChild(element("span", "cd-inherited",
      "\u00B7 " + count + " " + word + (count === 1 ? "" : "s")));
    return head;
  }

  function appendUsage(panel, typeName) {
    var index = usageIndex();
    var seen = {};
    var users = [];
    (index.users[typeName] || []).forEach(function (pair) {
      var key = pair[0] + "/" + pair[1];
      if (seen[key]) return;
      seen[key] = true;
      users.push(pair);
    });
    users.sort(function (a, b) {
      return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : (a[1] < b[1] ? -1 : 1);
    });
    var paths = index.paths[typeName] || [];
    var count = index.counts[typeName] || 0;
    if (!users.length && !count) return;

    // A section like the ones above it, not a fold. It was folded on the
    // grounds that it is asked for now and then, which made every reader who
    // does ask pay a click at every type — and it hid the one answer the tree
    // is for, where the type stands in a document. A section of its own also
    // takes the pane's width, as the attribute and child tables do, instead of
    // the reading measure a fold inherits.
    var box = element("section", "cd-usage");
    box.appendChild(element("h2", null, "Used by"));
    panel.appendChild(box);
    panel = box;

    // Where it stands in a document first: the concrete answer, and the one
    // neither predecessor could give. The headings name the level, because
    // both lists are elements and that is what tells them apart.
    if (count) {
      panel.appendChild(heading("In a dataset", count, "path"));
      appendPathList(panel, paths, count);
    }
    if (!users.length) return;
    panel.appendChild(heading("In the schema", users.length, "declaration"));
    // A table, as the pages have it: the names would otherwise start at a
    // different column on every line.
    appendTable(panel, "", users.slice(0, USAGE_LIMIT), [
      { head: "Type", cell: function (pair) { return typeCell(pair[0]); } },
      { head: "Name", cell: function (pair) { return text(pair[1], "code"); } }
    ]);
    if (users.length > USAGE_LIMIT) {
      panel.appendChild(element("p", "cd-inherited",
        "and " + (users.length - USAGE_LIMIT) + " more"));
    }
  }

  /* The path as an XPath, built from the model and not read off the screen.
     The crumbs are separate buttons with " / " between them, so a mouse
     selection of the line brings those spaces with it and what lands in a mail
     is not a path. The root comes from the declaration, as it does for the URL
     (`select`), rather than from the word written in the first crumb.

     No positional predicates. The tree is the schema's, not an instance's, so
     there is no index to state and inventing `[1]` would say something about a
     document nobody here has seen. */
  function xpathFor(path) {
    return "/" + [declaration(state.model.tree).name].concat(path).join("/");
  }

  var COPY_LABEL = "copy";

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    // `navigator.clipboard` needs a secure context, which a site served over
    // plain http on an intranet is not — and that is where this viewer is
    // deployed. The field has to be in the document for the selection to
    // reach it; it is kept off screen rather than hidden, since a field with
    // `display: none` cannot be selected.
    var field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.top = "-1000px";
    document.body.appendChild(field);
    field.select();
    var copied = false;
    try { copied = document.execCommand("copy"); } catch (e) { copied = false; }
    document.body.removeChild(field);
    return copied ? Promise.resolve() : Promise.reject(new Error("copy refused"));
  }

  function renderBreadcrumb() {
    var nav = element("nav", "cd-breadcrumb");
    var rootLink = element("button", "cd-crumb", "cpacs");
    rootLink.addEventListener("click", function () { select([]); });
    nav.appendChild(rootLink);
    var walked = [];
    for (var i = 0; i < state.path.length; i++) {
      walked = walked.concat(state.path[i]);
      nav.appendChild(document.createTextNode(" / "));
      var target = walked.slice();
      var crumb = element("button", "cd-crumb", state.path[i]);
      crumb.addEventListener("click", (function (path) {
        return function () { select(path); };
      })(target));
      nav.appendChild(crumb);
    }

    var xpath = xpathFor(state.path);
    var copy = element("button", "cd-copy", COPY_LABEL);
    copy.type = "button";
    copy.title = xpath;
    // The word is the accessible name, so that changing it is what a reader
    // who cannot see the button hears. An `aria-label` would fix the name to
    // "copy" and leave the outcome unsaid.
    copy.setAttribute("aria-live", "polite");
    copy.addEventListener("click", function () {
      function says(word) {
        copy.textContent = word;
        copy.classList.add("cd-copied");
        window.setTimeout(function () {
          copy.textContent = COPY_LABEL;
          copy.classList.remove("cd-copied");
        }, 1400);
      }
      // Says what happened rather than offering a way round it: there is
      // nothing selected for the reader to copy by hand, and the path is on
      // the button's `title` either way.
      copyText(xpath).then(function () { says("copied"); },
                           function () { says("not copied"); });
    });
    nav.appendChild(copy);
    return nav;
  }

  var TREE_WIDTH_KEY = "cpacs-doc.treeWidth";
  var MIN_DETAIL_WIDTH = 200;

  /* The strip is the column's chrome and none of it shrinks: the tabs are as
     wide as their words and the two round buttons are round. A column drawn
     narrower than the strip needs does not clip it — the row does not wrap and
     the column does not scroll, so the buttons spill across the splitter and
     land on the detail pane's breadcrumb. The strip is therefore the column's
     floor, and the splitter may not go under it.

     Measured rather than written down as a number: the strip is as wide as its
     words, in whatever font the reader has, and the Handbook tab is only among
     them where the schema has sections — 294 px against 202 px without it, at
     the 16 px root font this page was drawn for. */
  function stripWidth() {
    var tabs = document.getElementById("cd-tabs");
    if (!tabs) return 0;
    var declared = tabs.style.width;
    tabs.style.width = "min-content";
    var needed = tabs.scrollWidth;
    tabs.style.width = declared;
    return needed;
  }

  // Set by setupSplitter: the strip gains its Handbook tab only once the model
  // has arrived, which is after the stored width has been put in force.
  var recheckTreeWidth = function () {};

  function setupSplitter() {
    var splitter = document.getElementById("cd-splitter");
    var app = document.getElementById("cd-app");
    var column = document.querySelector(".cd-column");
    if (!splitter || !app || !column) return;

    // The column rather than the tree pane: the width is the column's, and the
    // pane holding it is hidden while the reader is in Search or the Handbook.
    function width() { return column.getBoundingClientRect().width; }

    function apply(px) {
      var limit = Math.max(stripWidth(), Math.min(px, window.innerWidth - MIN_DETAIL_WIDTH));
      app.style.setProperty("--tree-width", limit + "px");
      try { window.localStorage.setItem(TREE_WIDTH_KEY, String(limit)); } catch (e) { /* private mode */ }
    }
    // Only where the strip has outgrown the column: a width the reader has
    // never chosen has no business being written to storage as if they had.
    recheckTreeWidth = function () { if (width() < stripWidth()) apply(width()); };

    var stored = null;
    try { stored = window.localStorage.getItem(TREE_WIDTH_KEY); } catch (e) { stored = null; }
    // Through the clamp rather than straight on to the property: a width put
    // there before the strip was a floor can be narrower than the strip.
    if (stored) apply(parseFloat(stored));

    splitter.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      splitter.setPointerCapture(event.pointerId);
      var origin = app.getBoundingClientRect().left;
      function move(e) { apply(e.clientX - origin); }
      function stop() {
        splitter.removeEventListener("pointermove", move);
        splitter.removeEventListener("pointerup", stop);
      }
      splitter.addEventListener("pointermove", move);
      splitter.addEventListener("pointerup", stop);
    });

    // Keyboard equivalent, so the splitter is not a mouse-only control.
    splitter.addEventListener("keydown", function (event) {
      var step = event.shiftKey ? 64 : 16;
      var current = width();
      if (event.key === "ArrowLeft") { apply(current - step); event.preventDefault(); }
      if (event.key === "ArrowRight") { apply(current + step); event.preventDefault(); }
    });
  }

  /* ---- search (F12–F14) ----
   *
   * Built from the model that is already loaded, so there is no separate index
   * to ship or keep in step. Ranking follows F13: an exact name first, then a
   * name that starts with the query, then any name containing it, then body
   * text — because someone typing `wingUID` wants the element, not the twelve
   * descriptions that mention it. A path is read only where the query is a
   * path, which is the one with a slash in it.
   */
  var SEARCH_LIMIT = 60;
  var SEARCH_DELAY = 120;

  // On trial. 53,692 element entries are 2,224 distinct names, so a list of
  // places answers `mass` with 613 rows of the same word and leaves the path,
  // cut at the front in 352 px, to tell them apart. A name standing in more
  // than one place is therefore one row that says how many and opens them.
  // Measured over nine queries at every threshold from 2 to 10: raising it
  // brings the truncation straight back, because a name in two, three or four
  // places is the common case, and it makes the list longer rather than
  // shorter. Two is the only threshold the numbers support.
  var GROUP_MIN = 2;
  // The cut "Used by" makes on the same kind of list, for the same reason.
  var PLACE_LIMIT = 25;
  // Expanding is spelled the same here as in the tree.
  var MARK_CLOSED = "+";
  var MARK_OPEN = "\u2212";

  // Of the 58,920 entries 53,692 are elements, so on a broad query the whole
  // list was elements: `segment` matched 21,496 entries and every one of the
  // sixty shown was an element, while 55 types went unmentioned. Reserving
  // slots is what makes the other two kinds reachable without asking the
  // reader to do anything first. Whatever a kind cannot fill goes back.
  var KIND_SLOTS = { type: 15, attribute: 5 };
  var KINDS = ["element", "type", "attribute"];
  var KIND_LABEL = { element: "Elements", type: "Types", attribute: "Attributes" };

  // The same switch as the chips, spelled in the field. Whoever knows what
  // they are looking for should not have to reach for the mouse to say so;
  // whoever does not never has to meet this. `@` needs no colon — an attribute
  // is written that way in the schema, and the labels carry it.
  var KIND_PREFIX = { "type:": "type", "element:": "element", "attribute:": "attribute" };

  // A query with a slash in it is a path and nothing else: someone who types
  // `wings/wing` is not looking for the word in a description.
  function parseQuery(raw) {
    var text = raw.trim().toLowerCase();
    var kind = null;
    var names = Object.keys(KIND_PREFIX);
    for (var i = 0; i < names.length; i++) {
      if (text.indexOf(names[i]) !== 0) continue;
      kind = KIND_PREFIX[names[i]];
      text = text.slice(names[i].length).replace(/^\s+/, "");
      break;
    }
    if (kind === null && text.charAt(0) === "@") kind = "attribute";
    return { text: text, kind: kind, paths: text.indexOf("/") !== -1 };
  }

  // What is left in the field once the prefix is taken off it. Clicking a chip
  // has to remove one, or the field and the chips would say different things.
  function withoutPrefix(raw) {
    var names = Object.keys(KIND_PREFIX);
    var text = raw.replace(/^\s+/, "");
    for (var i = 0; i < names.length; i++) {
      if (text.toLowerCase().indexOf(names[i]) === 0) {
        return text.slice(names[i].length).replace(/^\s+/, "");
      }
    }
    return raw;
  }

  var RANK = {
    exactName: 0,
    prefixName: 1,
    name: 2,
    attribute: 3,
    path: 4,
    text: 5
  };

  function buildSearchEntries() {
    var entries = [];
    state.nodeByPath.forEach(function (node, path) {
      var decl = declaration(node);
      entries.push({
        kind: "element",
        label: decl.name || "?",
        path: path,
        detail: path,
        type: decl.type || "",
        text: (decl.documentation && decl.documentation.text) || ""
      });
    });
    Object.keys(state.model.types).forEach(function (name) {
      var type = state.model.types[name];
      var documentation = type.documentation || {};
      entries.push({
        kind: "type",
        label: name,
        typeName: name,
        detail: type.kind || "type",
        text: documentation.summary || ""
      });
      (type.attributes || []).forEach(function (attribute) {
        entries.push({
          kind: "attribute",
          label: "@" + attribute.name,
          typeName: name,
          detail: name,
          text: (attribute.documentation && attribute.documentation.text) || ""
        });
      });
    });
    return entries;
  }

  function scoreEntry(entry, query, asPath) {
    if (asPath) {
      return entry.path && entry.path.toLowerCase().indexOf(query) !== -1
        ? RANK.path : -1;
    }
    var label = entry.label.toLowerCase();
    if (label === query) return RANK.exactName;
    if (label.indexOf(query) === 0) return RANK.prefixName;
    if (label.indexOf(query) !== -1) {
      return entry.kind === "attribute" ? RANK.attribute : RANK.name;
    }
    // Not the path: every descendant of a `wingCutOut` carries it in its own
    // path, so `wingCutOut` answered with `eta`, `xsi` and the rest of what
    // stands under one. A reader who means a path says so with a slash, which
    // is the branch at the top and is what the `?` strip teaches. Amends F12
    // and F13, which have search read paths on every query.
    if (entry.text && entry.text.toLowerCase().indexOf(query) !== -1) return RANK.text;
    return -1;
  }

  // How many of the sixty places each kind gets. Elements keep whatever the
  // other two do not claim, and a kind with nothing to show claims nothing —
  // a query matching eight types and nine elements still shows all seventeen.
  function shareOut(kinds, filter) {
    var room = {};
    if (filter !== "all") {
      KINDS.forEach(function (kind) { room[kind] = kind === filter ? SEARCH_LIMIT : 0; });
      return room;
    }
    room.type = Math.min(kinds.type, KIND_SLOTS.type);
    room.attribute = Math.min(kinds.attribute, KIND_SLOTS.attribute);
    room.element = Math.min(kinds.element, SEARCH_LIMIT - room.type - room.attribute);
    var spare = SEARCH_LIMIT - room.element - room.type - room.attribute;
    KINDS.forEach(function (kind) {
      var more = Math.max(0, Math.min(spare, kinds[kind] - room[kind]));
      room[kind] += more;
      spare -= more;
    });
    return room;
  }

  // The shortest name first, because a short name is the whole of what was
  // asked for and a long one merely contains it.
  function byLabel(x, y) {
    if (x.label.length !== y.label.length) return x.label.length - y.label.length;
    return x.label < y.label ? -1 : x.label > y.label ? 1 : 0;
  }

  // For a path the same argument runs along the path instead: `wings/wing`
  // should answer with the wing, not with the 5,838 things standing under one.
  function byPath(x, y) {
    var a = x.path || "";
    var b = y.path || "";
    if (a.length !== b.length) return a.length - b.length;
    return a < b ? -1 : a > b ? 1 : 0;
  }

  // One row per name where a name has places enough to be worth a click, and
  // the places themselves where it has not. The group takes the best rank any
  // of its places had, so a name that matched exactly does not fall in behind
  // one that was only found in a path.
  function foldNames(byName, buckets, kinds) {
    Object.keys(byName).forEach(function (label) {
      var group = byName[label];
      if (group.places.length < GROUP_MIN) {
        for (var i = 0; i < group.places.length; i++) {
          buckets[group.ranks[i]].push(group.places[i]);
          kinds.element += 1;
        }
        return;
      }
      // Left in the order they were collected in, which is the order the tree
      // walks: a group's places all carry one name, so the shortest-path rule
      // the ranking uses would only shuffle them out of the order the reader
      // will meet them in.
      buckets[group.rank].push(group);
      kinds.element += 1;
    });
  }

  function search(raw) {
    var asked = parseQuery(raw);
    var query = asked.text;
    // Two characters, unless a prefix has already said what is wanted: `type:`
    // on its own is a fair question and the answer is every type there is.
    if (query.length < 2 && !(asked.kind && query.length === 0)) return null;
    if (!state.searchEntries) state.searchEntries = buildSearchEntries();

    // Collected into one bucket per rank rather than sorted as a whole: a
    // broad query matches tens of thousands of the 58,920 entries, and sorting
    // all of them to show sixty is where the time would go.
    var buckets = [[], [], [], [], [], []];
    var kinds = { element: 0, type: 0, attribute: 0 };
    // A query with a slash in it asks about places, so it is answered with
    // places: there is nothing to fold away for a reader who named one.
    var byName = asked.paths ? null : {};
    for (var i = 0; i < state.searchEntries.length; i++) {
      var entry = state.searchEntries[i];
      var rank = scoreEntry(entry, query, asked.paths);
      if (rank === -1) continue;
      if (byName && entry.kind === "element") {
        // The rank is kept per place, not only per name: where the name itself
        // does not match, one place can be found in its path and another in
        // its documentation, and the two do not rank alike.
        var group = byName[entry.label];
        if (!group) {
          group = byName[entry.label] = {
            kind: "element", label: entry.label, rank: rank,
            places: [], ranks: []
          };
        }
        if (rank < group.rank) group.rank = rank;
        group.places.push(entry);
        group.ranks.push(rank);
        continue;
      }
      buckets[rank].push(entry);
      kinds[entry.kind] += 1;
    }
    if (byName) foldNames(byName, buckets, kinds);

    // The prefix wins while it stands there: it is the more recent word from
    // the reader, and it is visible in the field, which the chip alone is not.
    var filter = asked.kind || state.searchFilter;
    var room = shareOut(kinds, filter);
    var total = filter === "all"
      ? kinds.element + kinds.type + kinds.attribute
      : kinds[filter];

    // Still in rank order across the kinds, so an exact name comes first
    // whatever kind it is; the quota only decides who is left out at the end.
    var shown = [];
    for (var b = 0; b < buckets.length && shown.length < SEARCH_LIMIT; b++) {
      buckets[b].sort(asked.paths ? byPath : byLabel);
      for (var k = 0; k < buckets[b].length && shown.length < SEARCH_LIMIT; k++) {
        var candidate = buckets[b][k];
        if (room[candidate.kind] <= 0) continue;
        room[candidate.kind] -= 1;
        shown.push(candidate);
      }
    }
    return { shown: shown, total: total, kinds: kinds, filter: filter,
             fromPrefix: asked.kind !== null };
  }

  // The counts the quota is computed from, made visible. Two readers are
  // served by the same row: one sees that 55 types exist before clicking, the
  // other narrows to them once and stays there.
  function renderFilters(result, apply) {
    var kinds = result.kinds;
    var row = element("div", "cd-filters");
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", "Narrow the results");
    var all = kinds.element + kinds.type + kinds.attribute;
    var choices = [["all", "All", all]];
    KINDS.forEach(function (kind) {
      choices.push([kind, KIND_LABEL[kind], kinds[kind]]);
    });
    choices.forEach(function (choice) {
      var chosen = result.filter === choice[0];
      var chip = element("button", "cd-filter", choice[1] + " ");
      chip.type = "button";
      chip.appendChild(element("span", "cd-filter-count", String(choice[2])));
      chip.setAttribute("aria-pressed", chosen ? "true" : "false");
      chip.tabIndex = chosen ? 0 : -1;
      chip.disabled = choice[2] === 0 && !chosen;
      chip.addEventListener("click", function () { apply(choice[0]); });
      row.appendChild(chip);
    });
    // One tab stop for the row; the arrow keys move inside it, as on the tabs.
    row.addEventListener("keydown", function (event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      var step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (!step) return;
      var chips = row.querySelectorAll(".cd-filter");
      for (var i = 0; i < chips.length; i++) {
        if (chips[i] !== document.activeElement) continue;
        for (var j = i + step; j >= 0 && j < chips.length; j += step) {
          if (chips[j].disabled) continue;
          chips[j].focus();
          chips[j].click();
          break;
        }
        event.preventDefault();
        return;
      }
    });
    return row;
  }

  // The tab above names the region and marks it, so a head saying "Results"
  // under it would be the second label for one thing.
  function renderResults(result, query, apply) {
    var panel = document.getElementById("cd-results");
    var count = document.getElementById("cd-search-count");
    panel.textContent = "";
    panel.appendChild(renderFilters(result, apply));
    // Said only to the reader who has just shown they want one kind, and only
    // until they take the shortcut: with the prefix in the field it is gone.
    if (result.filter !== "all" && !result.fromPrefix) {
      var note = element("p", "cd-filter-note", "same as typing ");
      note.appendChild(element("code", null, result.filter + ":"));
      note.appendChild(document.createTextNode(" in the field"));
      panel.appendChild(note);
    }

    if (!result.total) {
      count.textContent = "no matches";
      markSearchCount(0);
      panel.appendChild(element("p", "cd-empty",
        state.searchFilter === "all"
          ? "Nothing matches " + query + "."
          : "Nothing of that kind matches " + query + "."));
      return;
    }

    count.textContent = result.total > result.shown.length
      ? result.shown.length + " of " + result.total
      : String(result.total);
    markSearchCount(result.shown.length);

    var list = element("div", "cd-result-list");
    for (var i = 0; i < result.shown.length; i++) {
      list.appendChild(renderResult(result.shown[i]));
    }
    panel.appendChild(list);
  }

  // The query is not spent by being used: the reader goes to the tree, and
  // the Search tab still holds the field, the rows and the count. Sixty hits
  // are worth going through one at a time.
  function openEntry(entry) {
    if (entry.kind === "element") {
      // F14: results navigate into the tree, expanding the path. The stored
      // path already excludes the root element, as `state.path` does.
      showPane("tree");
      select(entry.path ? entry.path.split("/") : []);
      focusCursor();
    } else {
      showPane("tree");
      showType(entry.typeName);
      focusDetail();
    }
  }

  function renderResult(entry) {
    if (entry.places) return renderGroup(entry);
    var row = element("button", "cd-result");
    // Named on the row: the quota above decides how many of each kind are
    // here, and nothing else in the markup says which one a row is.
    row.setAttribute("data-kind", entry.kind);
    var label = element("span", "cd-result-label", entry.label);
    if (entry.kind === "type") label.className += " cd-result-type";
    row.appendChild(label);
    row.appendChild(element("span", "cd-result-detail", entry.detail));
    row.addEventListener("click", function () { openEntry(entry); });
    return row;
  }

  // A name and the number of places it stands in. The places are built when
  // the reader opens them and not before: `x` would otherwise put 5,448
  // buttons into the document for a row nobody clicked.
  function renderGroup(group) {
    var box = element("div", "cd-fold");
    var row = element("button", "cd-result");
    row.setAttribute("data-kind", group.kind);
    row.setAttribute("aria-expanded", "false");
    var mark = element("span", "cd-fold-mark", MARK_CLOSED);
    mark.setAttribute("aria-hidden", "true");
    row.appendChild(mark);
    row.appendChild(element("span", "cd-result-label", group.label));
    row.appendChild(element("span", "cd-fold-count",
      group.places.length + " places"));
    var list = element("div", "cd-place-list");
    list.hidden = true;
    row.addEventListener("click", function () {
      var open = row.getAttribute("aria-expanded") === "true";
      if (!open && !list.childNodes.length) fillPlaces(list, group);
      row.setAttribute("aria-expanded", open ? "false" : "true");
      mark.textContent = open ? MARK_CLOSED : MARK_OPEN;
      list.hidden = open;
    });
    box.appendChild(row);
    box.appendChild(list);
    return box;
  }

  // Every place in a group ends in the group's own name, so the row leaves it
  // off: what tells two places apart is where they stand, and the name is on
  // the row above them. A place directly under the root has nothing else.
  function placeLabel(path) {
    var cut = path.lastIndexOf("/");
    return cut === -1 ? path : path.slice(0, cut);
  }

  // The path is written out and wrapped rather than cut. A result row cuts at
  // the front because the tail tells two occurrences apart, and between
  // different names it does — but the places of one name are exactly the case
  // where it does not: the nine places of `wingCutOut` end in three tails, and
  // what separates them is `aircraft` against `rotorcraft` at the front.
  // Measured on the real schema: of the 1,279 names that fold, 895 (70 %) had
  // two places the row could not tell apart with 45 characters, 559 (43 %)
  // with the front and the tail both kept, and 31 (2 %) with the path written
  // out — and those 31 are the schema's own ambiguous paths, which the report
  // already carries as TREE_PATH_AMBIGUOUS. Three lines is the median cost.
  function fillPlaces(list, group) {
    var places = group.places.slice(0, PLACE_LIMIT);
    for (var i = 0; i < places.length; i++) {
      var item = element("button", "cd-place");
      item.appendChild(pathText(placeLabel(places[i].path)));
      item.addEventListener("click", opener(places[i]));
      list.appendChild(item);
    }
    if (group.places.length > PLACE_LIMIT) {
      list.appendChild(element("p", "cd-place-more",
        "and " + (group.places.length - PLACE_LIMIT)
        + " more \u2014 name a path to narrow them"));
    }
  }

  function opener(place) {
    return function () { openEntry(place); };
  }

  // Broken at the slashes and not anywhere: left to the wrapping alone the
  // column split `componentSegment` down the middle. A `wbr` is a break
  // opportunity and nothing more — the path itself, and so what the row says,
  // is unchanged.
  function pathText(path) {
    var span = element("span", "cd-place-path");
    var segments = path.split("/");
    for (var i = 0; i < segments.length; i++) {
      var last = i === segments.length - 1;
      span.appendChild(document.createTextNode(segments[i] + (last ? "" : "/")));
      if (!last) span.appendChild(element("wbr"));
    }
    return span;
  }

  // The focus has to go somewhere once the results are gone. Whoever closes
  // the search says where: back to the tree cursor when the reader gave the
  // search up, nowhere when a result is opened and the target takes it.
  /* ---- the general documentation ----
   *
   * The prose that belongs to the schema as a whole hangs off the root
   * element's type, where the viewer would only ever show it as one scroll
   * behind one node — 31 sections and 5,720 words in CPACS 3.5.1. Split by the
   * extractor, each section is an entry here, opens in the detail panel like a
   * type, and has a page of its own to cite.
   *
   * The list is the document's own table of contents, in document order and
   * with the titles as written. Grouping the twenty version entries under a
   * heading of our own would mean deciding from a title what a section is
   * about; when a title stops matching the guess, the grouping breaks quietly.
   * If they belong together, the schema can say so by nesting them.
   */

  function sections() {
    return (state.model.documentation && state.model.documentation.sections) || [];
  }

  function sectionBySlug(slug) {
    var list = sections();
    for (var i = 0; i < list.length; i++) {
      if (list[i].slug === slug) return list[i];
    }
    return null;
  }

  function renderDocs() {
    var pane = document.getElementById("cd-docs");
    pane.textContent = "";
    var list = sections();
    var box = element("div", "cd-result-list");
    for (var i = 0; i < list.length; i++) {
      box.appendChild(docEntry(list[i]));
    }
    pane.appendChild(box);
  }

  function docEntry(section) {
    var row = element("button", "cd-result");
    if (section.slug === state.shownSection) row.className += " cd-selected";
    row.appendChild(element("span", "cd-result-label", section.title));
    row.addEventListener("click", function () { showSection(section.slug); });
    return row;
  }

  function showSection(slug) {
    state.shownType = null;
    state.shownSection = slug;
    renderDocs();
    renderDetail();
    var panel = document.getElementById("cd-detail");
    if (panel && panel.scrollTo) panel.scrollTo(0, 0);
  }

  function setupTabs() {
    var tabs = document.getElementById("cd-tabs");
    if (!tabs) return;
    label("cd-tree", "cd-tab-tree");
    label("cd-search-panel", "cd-tab-search");
    // No sections, no third tab: one half is not a choice, and a tab naming
    // an empty pane says nothing. Tree and Search are always both there.
    if (sections().length) {
      document.getElementById("cd-tab-docs").hidden = false;
      label("cd-docs", "cd-tab-docs");
      // The strip has just taken its final width; the column may not be under it.
      recheckTreeWidth();
    }

    tabs.addEventListener("click", function (event) {
      var tab = event.target.closest ? event.target.closest(".cd-tab") : event.target;
      if (!tab) return;
      if (tab.id === "cd-tab-docs") { renderDocs(); showPane("docs"); }
      else if (tab.id === "cd-tab-tree") { showPane("tree"); focusCursor(); }
      else if (tab.id === "cd-tab-search") { showPane("search"); focusSearch(); }
    });

    // A tab strip is one tab stop; the arrow keys move within it, over the
    // tabs that are actually there.
    tabs.addEventListener("keydown", function (event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      var step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (!step) return;
      var shown = [];
      var all = tabs.querySelectorAll(".cd-tab");
      for (var i = 0; i < all.length; i++) if (!all[i].hidden) shown.push(all[i]);
      for (var j = 0; j < shown.length; j++) {
        if (shown[j] !== document.activeElement) continue;
        var next = shown[j + step];
        if (!next) return;
        next.focus();
        next.click();
        event.preventDefault();
        return;
      }
    });
  }

  function focusSearch() {
    var field = document.getElementById("cd-search");
    if (!field) return;
    field.focus();
    field.select();
  }

  // The tab carries what the field's count carries, for the moments the field
  // is not on screen: the reader who opened a result and is now in the tree.
  function markSearchCount(shown) {
    var mark = document.getElementById("cd-tab-count");
    if (mark) mark.textContent = shown ? String(shown) : "";
  }

  function label(paneId, tabId) {
    var pane = document.getElementById(paneId);
    if (!pane) return;
    pane.setAttribute("role", "tabpanel");
    pane.setAttribute("aria-labelledby", tabId);
  }

  // Escape gives the query up, which is the one thing that empties the tab:
  // everything else leaves it standing, so a reader can come back to it.
  function closeSearch(returnFocus) {
    var field = document.getElementById("cd-search");
    if (field) field.value = "";
    document.getElementById("cd-results").textContent = "";
    document.getElementById("cd-search-count").textContent = "";
    markSearchCount(0);
    showPane("tree");
    if (returnFocus) focusCursor();
  }

  // One slot, three places: the tree, the search, and the documentation. A
  // second navigation area for eleven chapters would cost more room than the
  // chapters are worth, and the reader is never reading two of the three at
  // once. The strip stays put and marks the one that is showing — that is
  // what tells a swap from a layer, and the results had neither before.
  function showPane(name) {
    document.getElementById("cd-tree").hidden = name !== "tree";
    document.getElementById("cd-search-panel").hidden = name !== "search";
    document.getElementById("cd-docs").hidden = name !== "docs";
    state.tab = name;
    markTab("cd-tab-tree", name === "tree");
    markTab("cd-tab-docs", name === "docs");
    markTab("cd-tab-search", name === "search");
    fitHintToTab();
  }

  function markTab(id, current) {
    var tab = document.getElementById(id);
    if (!tab) return;
    tab.setAttribute("aria-selected", String(current));
    tab.tabIndex = current ? 0 : -1;
  }

  function docsAreOpen() {
    var pane = document.getElementById("cd-docs");
    return !!pane && !pane.hidden;
  }

  function setupSearch() {
    var field = document.getElementById("cd-search");
    if (!field) return;
    var timer = null;

    function run() {
      var hits = search(field.value);
      if (hits === null) {
        document.getElementById("cd-results").textContent = "";
        document.getElementById("cd-search-count").textContent = "";
        markSearchCount(0);
        return;
      }
      renderResults(hits, parseQuery(field.value).text, apply);
    }

    // A chip and a prefix are the same switch, so choosing with one clears the
    // other: a field reading `type:` under a pressed "All" would be a lie.
    function apply(kind) {
      state.searchFilter = kind;
      var stripped = withoutPrefix(field.value);
      if (stripped !== field.value) field.value = stripped;
      run();
    }

    field.addEventListener("input", function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(run, SEARCH_DELAY);
    });

    field.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeSearch(true);
      if (event.key === "ArrowDown") {
        var first = document.getElementById("cd-results").querySelector(".cd-result");
        if (first) {
          first.focus();
          event.preventDefault();
        }
      }
      if (event.key === "Enter") {
        var top = document.getElementById("cd-results").querySelector(".cd-result");
        if (top && top.click) top.click();
      }
    });
  }

  function fail(message) {
    document.getElementById("cd-app").textContent = "";
    var panel = element("div", "cd-error");
    panel.appendChild(element("h1", null, "Not found"));
    panel.appendChild(element("p", null, message));
    document.getElementById("cd-app").appendChild(panel);
  }

  function start() {
    var location = parseLocation();
    if (location === null) {
      // A genuine 404: a path that is not a tree path at all. Reporting it as
      // an error is the point (R3); routing everything into the viewer would
      // hide real broken links.
      fail("This address does not exist in the documentation.");
      return;
    }
    state.root = location.root;
    setupSplitter();
    setupSearch();
    setupTreeKeys();
    setupListKeys("cd-results");
    setupListKeys("cd-docs");
    setupGlobalKeys();
    setupHelp();

    function show(model) {
      state.model = model;
      indexTree();
      var rootName = declaration(model.tree).name;
      var segments = location.segments;
      // The root element is part of the URL but not of the internal path.
      if (segments.length && segments[0] === rootName) segments = segments.slice(1);
      state.path = segments;
      state.cursor = segments;
      expandAncestors(segments);
      renderTree();
      renderDetail();
      setupTabs();
      setupHint();
    }

    var inline = document.getElementById(MODEL_ELEMENT);
    if (inline) {
      // One file: the model is read out of the document, because a browser
      // refuses `fetch` on a file:// URL and that is where this form is opened.
      try {
        show(JSON.parse(inline.textContent));
      } catch (error) {
        fail("The documentation model could not be read: " + error.message);
      }
      return;
    }

    fetch(state.root + MODEL_FILE)
      .then(function (response) {
        if (!response.ok) throw new Error("model unavailable (" + response.status + ")");
        return response.json();
      })
      .then(show)
      .catch(function (error) {
        fail("The documentation model could not be loaded: " + error.message);
      });
  }

  function restore() {
    var location = parseLocation();
    if (!location || !state.model) return;
    var segments = location.segments;
    var rootName = declaration(state.model.tree).name;
    if (segments.length && segments[0] === rootName) segments = segments.slice(1);
    // The address names a tree path, so that is what the panel must show: a
    // type or a section standing in front of it belongs to the place the
    // reader has just left. `select` clears them for the same reason.
    state.shownType = null;
    state.shownSection = null;
    state.path = segments;
    state.cursor = segments;
    expandAncestors(segments);
    renderTree();
    renderDetail();
  }

  window.addEventListener("popstate", restore);
  // One file addresses itself by fragment, and a fragment the reader edits by
  // hand fires this event alone.
  window.addEventListener("hashchange", restore);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();