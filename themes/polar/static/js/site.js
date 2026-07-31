(function ($, window, document) {
    "use strict";

    var DESKTOP_BREAKPOINT = 960;
    var NAVBAR_OFFSET = 110;
    var ONE_PAGE_SCROLL_OFFSET = 84;
    var $window = $(window);
    var resizeTimer = null;
    var scrollScheduled = false;

    function hasPlugin(name) {
        return typeof $.fn[name] === "function";
    }

    function hidePreloader() {
        $(".spinner").fadeOut();
        $(".pre-loader").delay(200).fadeOut("slow");
    }

    function updateHeroLayout() {
        var windowWidth = $window.width();
        var windowHeight = $window.height();
        var $heroElements = $(".top-section .image-container, .top-section .overlay");
        var $fullHeightOverlay = $(".top-slider-container.v2 .overlay");

        if (windowWidth > DESKTOP_BREAKPOINT) {
            $heroElements.css("height", windowHeight - 100);
            $fullHeightOverlay.css("height", windowHeight);

            var topPadding = (windowHeight - 420) / 2;
            if (topPadding > 100) {
                $heroElements.css("padding-top", topPadding);
                $fullHeightOverlay.css("padding-top", topPadding + 80);
            } else {
                $heroElements.css("padding-top", "");
                $fullHeightOverlay.css("padding-top", "");
            }
        } else {
            $heroElements.css({ height: "auto", paddingTop: "" });
            $fullHeightOverlay.css({ height: "auto", paddingTop: "" });
        }
    }

    function initSubmenus() {
        var $menus = $(".has-sub-menu");

        $menus.off(".cpacsSubmenu");
        if ($window.width() <= DESKTOP_BREAKPOINT) {
            $menus.children("ul.sub-menu").stop(true, true).hide();
            return;
        }

        $menus
            .on("mouseenter.cpacsSubmenu", function () {
                $(this).children("ul.sub-menu").stop(true, true).slideDown();
            })
            .on("mouseleave.cpacsSubmenu", function () {
                $(this).children("ul.sub-menu").stop(true, true).slideUp();
            });
    }

    function initResponsiveVideos() {
        if ($(".video-container").length && hasPlugin("fitVids")) {
            $(".video-container").fitVids();
        }
    }

    function initOnePageNavigation() {
        var $navigation = $("#main-menu #mainNavigation");
        if (!$navigation.length || !hasPlugin("onePageNav")) {
            return;
        }

        $navigation.onePageNav({
            currentClass: "active",
            changeHash: false,
            scrollSpeed: 750,
            scrollThreshold: 0.5,
            scrollOffset: ONE_PAGE_SCROLL_OFFSET,
            filter: ":not(.sub-menu a, .not-in-home, .donate)",
            easing: "swing"
        });
    }

    function updateStickyNavigation() {
        var shouldStick = $window.scrollTop() > $window.height() - NAVBAR_OFFSET;
        $("#main-menu").toggleClass("navbar-fixed-top", shouldStick);
    }

    function updateScrollToTop() {
        var $button = $("#go-top-top");
        if ($window.scrollTop() > 700) {
            $button.stop(true, true).fadeIn("slow");
        } else {
            $button.stop(true, true).fadeOut("slow");
        }
    }

    function scheduleScrollUpdate() {
        if (scrollScheduled) {
            return;
        }

        scrollScheduled = true;
        (window.requestAnimationFrame || window.setTimeout)(function () {
            updateStickyNavigation();
            updateScrollToTop();
            scrollScheduled = false;
        }, 16);
    }

    function scheduleResizeUpdate() {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(function () {
            updateHeroLayout();
            initSubmenus();
            scheduleScrollUpdate();
        }, 100);
    }

    function initScrollToTop() {
        $("#go-top-top").on("click.cpacs", function (event) {
            event.preventDefault();
            $("html, body").animate({ scrollTop: 0 }, 1000);
        });
    }

    $(function () {
        initSubmenus();
        initResponsiveVideos();
        initScrollToTop();
        scheduleScrollUpdate();
    });

    $window
        .on("load.cpacs", function () {
            hidePreloader();
            updateHeroLayout();
            initOnePageNavigation();
            scheduleScrollUpdate();
        })
        .on("resize.cpacs", scheduleResizeUpdate)
        .on("scroll.cpacs", scheduleScrollUpdate);
})(jQuery, window, document);
