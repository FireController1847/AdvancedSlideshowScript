var primarySlideshow;

window.onload = function() {
    primarySlideshow = new Slideshow(
        Slideshow.getItemsFromElement("quote-slideshow", "slideshow-item"),
        Slideshow.getItemsFromElement("quote-slideshow-indicators", "slideshow-indicator"),
        true,
        true,
        true,
        7500,
        10000,
        "slideshow-indicator-selected",
        "slideshow-item-prev",
        "slideshow-item-selected",
        "slideshow-item-next",
        "slideshow-item-transitioning",
        "slideshow-item-notransition"
    );
}