class Slideshow {

    /**
     * Constructs a new slideshow.
     * 
     * @param {Array.<HTMLElement>} items The HTMLElements for this slideshow in the form of an array
     * @param {Array.<HTMLElement>} indicators The HTMLElements for the indicators for this slideshow in the form of an array
     * @param {boolean} loop Whether or not to loop this slideshow
     * @param {boolean} shouldDebounce Whether or not to debounce transitions for this slideshow
     * @param {boolean} shouldAutoTransition Whether or not this slideshow should auto-transition
     * @param {number} autoTransitionTime The amount of time between automatic transitions
     * @param {number} autoTransitionDelay The amount of time between when the automatic transition should re-enable after a manual transition has happened
     * @param {string} selectedIndicatorClass The class to give selected indcators
     * @param {string} prevItemClass The class to give 'previous' items, or items that have already been shown
     * @param {string} selectedItemClass The class to give the 'selected' item
     * @param {string} nextItemClass The class to give 'next' items, or items that are going to be shown
     * @param {string} transitioningClass The class to give items that are currently transitioning
     * @param {string} notransitionClass The class to give items when they shouldn't transition (overrides transitioning)
     */
    constructor(
        items,
        indicators,
        loop,
        shouldDebounce,
        shouldAutoTransition,
        autoTransitionTime,
        autoTransitionDelay,
        selectedIndicatorClass,
        prevItemClass,
        selectedItemClass,
        nextItemClass,
        transitioningClass,
        notransitionClass
    ) {
        this.items = items;
        this.indicators = indicators;
        this.loop = loop;
        this.shouldDebounce = shouldDebounce;
        this.shouldAutoTransition = shouldAutoTransition;
        this.autoTransitionTime = autoTransitionTime;
        this.autoTransitionDelay = autoTransitionDelay;
        this.selectedIndicatorClass = selectedIndicatorClass;
        this.prevItemClass = prevItemClass;
        this.selectedItemClass = selectedItemClass;
        this.nextItemClass = nextItemClass;
        this.transitioningClass = transitioningClass;
        this.notransitionClass = notransitionClass;

        // Prepare debounce
        this.transitioning = false;
        this.transitioningTimeout = null;

        // Validate & initiate indicators
        if (this.indicators != null) {
            if (this.items.length != this.indicators.length) {
                console.error("Invalid number of indicators! Number of indicators must match number of items.");
            } else {
                this.initiateIndicators();
            }
        }

        // Prepare auto transition
        this.autoTransitionDirection = 1; // 1 = forward, 0 = backward
        this.autoTransitionInterval = null;
        this.autoTransitionTimeout = null;
        this.startAutoTransition();
    }

    /**
     * Initializes the indicators to contain a `data-index` attribute with the index they should point at.
     * Indicators must manually include the `onclick` event for transitions.
     */
    initiateIndicators() {
        for (var i = 0; i < this.indicators.length; i++) {
            this.indicators[i].setAttribute("data-index", i);
        }
    }

    /**
     * Loops through all indicators and adds the selected class, otherwise 
     * 
     * @param {number} selectedIndex The index of the currently selected item.
     */
    updateIndicators(selectedIndex) {
        for (var i = 0; i < this.indicators.length; i++) {
            if (i == selectedIndex) {
                this.indicators[i].classList.add(this.selectedIndicatorClass);
            } else if (this.indicators[i].classList.contains(this.selectedIndicatorClass)) {
                this.indicators[i].classList.remove(this.selectedIndicatorClass);
            }
        }
    }

    /**
     * Searches for the item that contains the selectedItemClass and returns its index.
     * 
     * @returns {number} The index or -1 if not found.
     */
    getSelectedIndex() {
        for (var i = 0; i < this.items.length; i++) {
            if (this.items[i].classList.contains(this.selectedItemClass)) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Determines whether or not we are at the front of the items list.
     * 
     * @returns {boolean} True if we are at the front, false otherwise
     */
    isAtFront() {
        var selectedIndex = this.getSelectedIndex();
        if (selectedIndex == 0) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Determines whether or not we are at the end of the items list.
     * 
     * @returns {boolean} True if we are at the end, false otherwise
     */
    isAtEnd() {
        var selectedIndex = this.getSelectedIndex();
        if (selectedIndex == this.items.length - 1) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Steps this slideshow into a transitioning state with a timeout.
     * @returns {boolean} Whether or not the calling method should return.
     */
    debounce() {
        if (this.shouldDebounce) {
            if (this.transitioning) {
                return true;
            }
            this.transitioning = true;

            // In case we get locked out
            if (this.transitioningTimeout != null) {
                clearTimeout(this.transitioningTimeout);
            }
            var object = this;
            this.transitioningTimeout = setTimeout(function() {
                object.transitioning = false;
            }, 3000); // A good transition should take no longer than 3 seconds
        }
        return false;
    }

    /**
     * Forcefull ends a debounce.
     */
    endDebounce() {
        if (this.shouldDebounce) {
            if (this.transitioningTimeout != null) {
                clearTimeout(this.transitioningTimeout);
            }
            this.transitioning = false;
        }
    }

    /**
     * Transitions the slideshow forward.
     * @param {boolean} auto Whether or not this transition was automatic.
     */
    transitionForward(auto = true) {
        // Debounce
        if (this.debounce()) {
            return;
        }

        // Reset transitions
        this.resetAllTransitioning();

        // Stop auto transition
        if (!auto && this.shouldAutoTransition) {
            this.stopAutoTransition();
        }

        // Get selected
        var selectedIndex = this.getSelectedIndex();
        var selected = this.items[selectedIndex];

        // Get next
        var looping = false;
        var nextIndex = selectedIndex + 1;
        if (nextIndex == this.items.length) {
            // If we shouldn't loop, return
            if (!this.loop) {
                this.endDebounce();
                return;
            }
            looping = true;

            // Otherwise, set the next index to zero
            nextIndex = 0;
        }
        var next = this.items[nextIndex];

        // Update indicators
        this.updateIndicators(nextIndex);

        // If we're looping, flip the positions of all other items
        if (looping) {
            this.reclauclatePositions(selectedIndex, true);
        }

        // Mark selected transitioning
        var object = this;
        var selectedLoopTimeout;
        this.markTransitioning(selected, false, function() {
            // If we looped and the transition has completed, reclauclate positions with the new selected index
            if (looping) {
                object.reclauclatePositions(nextIndex);
                if (selectedLoopTimeout != null) {
                    clearTimeout(selectedLoopTimeout);
                }
            }
        });
        if (looping) {
            // A backup timeout in case the callback is not called
            selectedLoopTimeout = setTimeout(function() {
                object.reclauclatePositions(nextIndex);
            }, 3000); // A good transition should take no longer than 3 seconds
        }

        // Mark next transitioning
        this.markTransitioning(next, true);

        // Move selected to prev (since it has now been seen)
        selected.classList.remove(this.selectedItemClass);
        selected.classList.add(this.prevItemClass);

        // Move next to selected (since it is going to be shown)
        next.classList.remove(this.nextItemClass);
        next.classList.add(this.selectedItemClass);
    }

    /**
     * Transitions the slideshow backward.
     * @param {boolean} auto Whether or not this transition was automatic.
     */
    transitionBackward(auto = true) {
        // Debounce
        if (this.debounce()) {
            return;
        }

        // Reset transitions
        this.resetAllTransitioning();

        // Stop auto transition
        if (!auto && this.shouldAutoTransition) {
            this.stopAutoTransition();
        }

        // Get selected
        var selectedIndex = this.getSelectedIndex();
        var selected = this.items[selectedIndex];

        // Get prev
        var looping = false;
        var prevIndex = selectedIndex - 1;
        if (prevIndex < 0) {
            // If we shouldn't loop, return
            if (!this.loop) {
                this.endDebounce();
                return;
            }
            looping = true;

            // Otherwise, set the prev index to length - 1
            prevIndex = this.items.length - 1;
        }
        var prev = this.items[prevIndex];

        // Update indicators
        this.updateIndicators(prevIndex);

        // If we're looping, flip the positions of all other items
        if (looping) {
            this.reclauclatePositions(selectedIndex, true);
        }

        // Mark selected transitioning
        var object = this;
        this.markTransitioning(selected, false, function() {
            // If we looped and the transition has completed, reclauclate positions with the new selected index
            if (looping) {
                object.reclauclatePositions(prevIndex);
            }
        });

        // Mark prev transitioning
        this.markTransitioning(prev, true);

        // Move selected to next (since it has now been seen, but backward)
        selected.classList.remove(this.selectedItemClass);
        selected.classList.add(this.nextItemClass);

        // Move prev to selected (since it is going to be shown)
        prev.classList.remove(this.prevItemClass);
        prev.classList.add(this.selectedItemClass);
    }

    /**
     * Transitions to the specified target index.
     * @param {any} targetIndex The index to transition to.
     */
    transitionTo(targetIndex) {
        // Ignore if selected index is the same as target index
        var selectedIndex = this.getSelectedIndex();
        if (selectedIndex == targetIndex) {
            return;
        }

        // Debounce
        if (this.debounce()) {
            return;
        }

        // Reset transitions
        this.resetAllTransitioning();

        // Stop auto transition
        if (this.shouldAutoTransition) {
            this.stopAutoTransition();
        }

        // Update indicators
        this.updateIndicators(targetIndex);

        // Get selected
        var selected = this.items[selectedIndex];

        // Get target
        var target = this.items[targetIndex];

        // Determine direction
        // If the selected index is less than the target index, go previous
        // Otherwise, go next
        if (selectedIndex < targetIndex) {
            // Get distance
            var distance = targetIndex - selectedIndex;

            // Mark selected as transitioning
            var object = this;
            this.markTransitioning(selected, false, function() {
                // Move each item distance times (function/callback loop)
                object.transitionToPrevLoop(selectedIndex, distance, 1, function() {
                    // Mark transitioning
                    object.markTransitioning(target, true);

                    // Move target to selected
                    target.classList.remove(object.nextItemClass);
                    target.classList.add(object.selectedItemClass);
                });
            });

            // Move selected to prev (since we need to go to the previous)
            selected.classList.remove(this.selectedItemClass);
            selected.classList.add(this.prevItemClass);
        } else {
            // Get distance
            var distance = selectedIndex - targetIndex;

            // Mark selected as transitioning
            var object = this;
            this.markTransitioning(selected, false, function() {
                // Move each item distance times (function/callback loop)
                object.transitionToNextLoop(selectedIndex, distance, 1, function() {
                    // Mark transitioning
                    object.markTransitioning(target, true);

                    // Move target to selected
                    target.classList.remove(object.prevItemClass);
                    target.classList.add(object.selectedItemClass);
                });
            });

            // Move selected to next (since we need to go to the next)
            selected.classList.remove(this.selectedItemClass);
            selected.classList.add(this.nextItemClass);
        }
    }

    transitionToPrevLoop(selectedIndex, distance, i, callback) {
        // End loop
        if (i >= distance) {
            callback();
            return;
        }

        // Get 'current' item
        var current = this.items[selectedIndex + i];

        // Mark transitioning
        var object = this;
        this.markTransitioning(current, false, function() {
            // Loop
            object.transitionToPrevLoop(selectedIndex, distance, ++i, callback);
        });

        // Move current to prev
        current.classList.remove(this.nextItemClass);
        current.classList.add(this.prevItemClass);
    }

    transitionToNextLoop(selectedIndex, distance, i, callback) {
        // End loop
        if (i >= distance) {
            callback();
            return;
        }

        // Get 'current' item
        var current = this.items[selectedIndex - i];

        // Mark transitioning
        var object = this;
        this.markTransitioning(current, false, function() {
            // Loop
            object.transitionToNextLoop(selectedIndex, distance, ++i, callback);
        });

        // Move current to next
        current.classList.remove(this.prevItemClass);
        current.classList.add(this.nextItemClass);
    }

    startAutoTransition() {
        if (this.autoTransitionInterval != null) {
            clearInterval(this.autoTransitionInterval);
            this.autoTransitionInterval = null;
        }
        var object = this;
        this.autoTransitionInterval = setInterval(function() {
            object.autoTransition();
        }, this.autoTransitionTime);
    }

    stopAutoTransition() {
        if (this.autoTransitionInterval != null) {
            clearInterval(this.autoTransitionInterval);
            this.autoTransitionInterval = null;
        }
        if (this.autoTransitionTimeout != null) {
            clearTimeout(this.autoTransitionTimeout);
            this.autoTransitionTimeout = null;
        }
        var object = this;
        this.autoTransitionTimeout = setTimeout(function() {
            object.startAutoTransition();
            clearTimeout(object.autoTransitionTimeout);
            object.autoTransitionTimeout = null;
        }, this.autoTransitionDelay);
    }

    autoTransition() {
        if (this.loop) {
            this.transitionForward();
        } else {
            if (this.isAtEnd()) {
                this.autoTransitionDirection = 0;
            } else if (this.isAtFront()) {
                this.autoTransitionDirection = 1;
            }
            if (this.autoTransitionDirection == 1) {
                this.transitionForward();
            } else {
                this.transitionBackward();
            }
        }
    }

    /**
     * Recalculates the positions of all items based on the selected index.
     * 
     * @param {number} selectedIndex The index of the selected item.
     * @param {boolean} shouldFlipPositions Whether or not we should flip the positions of all items (next -> prev, or prev -> next)
     */
    reclauclatePositions(selectedIndex, shouldFlipPositions = false) {
        for (var i = 0; i < this.items.length; i++) {
            // Don't touch the selected index
            if (i == selectedIndex) {
                continue;
            }

            // Do not transition items
            if (this.notransitionClass != null) {
                this.items[i].classList.add(this.notransitionClass);
            }

            // If the item is ahead of the selected index, give it the previous item class (meaning it has been seen)
            // Otherwise, give it the next item class (meaning it has yet to be seen)
            // If we should flip positions, do the opposite check.
            if (shouldFlipPositions) {
                if (i > selectedIndex) {
                    this.items[i].classList.remove(this.nextItemClass);
                    this.items[i].classList.add(this.prevItemClass);
                } else {
                    this.items[i].classList.remove(this.prevItemClass);
                    this.items[i].classList.add(this.nextItemClass);
                }
            } else {
                if (i < selectedIndex) {
                    this.items[i].classList.remove(this.nextItemClass);
                    this.items[i].classList.add(this.prevItemClass);
                } else {
                    this.items[i].classList.remove(this.prevItemClass);
                    this.items[i].classList.add(this.nextItemClass);
                }
            }

            // Force position recalculation and then re-enable transitions
            this.items[i].offsetHeight; // Force a reflow, flushing the CSS changes
            if (this.notransitionClass != null) {
                this.items[i].classList.remove(this.notransitionClass);
            }
        }
    }

    /**
     * Preapres an item to be transitioned.
     * 
     * @param {HTMLElement} item The item.
     * @param {boolean} endDebounce Whether or not the debounce should be ended when the transition has completed.
     * @param {Function} callback Called when the transition has completed.
     */
    markTransitioning(item, endDebounce, callback = null) {
        // If there is no transitioning class, return
        if (this.transitioningClass == null) {
            return;
        }

        // A backup timeout in case onTransitionEnd is never called
        var backupTimeout;

        // Add "Transition End" Listener
        var object = this;
        item.addEventListener("transitionend", function onTransitionEnd() {
            // Remove transitioning class and the event listener
            item.classList.remove(object.transitioningClass);
            item.removeEventListener("transitionend", onTransitionEnd);

            // Clear backup timeout
            // If the timeout is null, it has already been called.
            if (backupTimeout == null) {
                return;
            } else {
                clearTimeout(backupTimeout);
            }

            // Set transitioning to false if the timeout is not null
            if (endDebounce) {
                if (object.transitioningTimeout != null && object.shouldDebounce) {
                    object.transitioning = false;
                    clearTimeout(object.transitioningTimeout);
                }
            }

            // Call the callback
            if (callback != null) {
                callback();
            }
        });

        // Set backup timeout
        backupTimeout = setTimeout(function() {
            backupTimeout = null;

            // Set transitioning to false if the timeout is not null
            if (object.transitioningTimeout != null && object.shouldDebounce) {
                object.transitioning = false;
                clearTimeout(object.transitioningTimeout);
            }

            // Call the callback
            if (callback != null) {
                callback();
            }
        }, 3000); // A good transition should take no longer than 3 seconds

        // Add the transitioning class
        item.classList.add(this.transitioningClass);
    }

    /**
     * Ensures that every single item is not currently transitioning.
     */
    resetAllTransitioning() {
        // If there is no transitioning class, return
        if (this.transitioningClass == null) {
            return;
        }

        // Loop
        for (var i = 0; i < this.items.length; i++) {
            if (this.items[i].classList.contains(this.transitioningClass)) {
                this.items[i].classList.remove(this.transitioningClass);
            }
        }
    }

    /**
     * Fetches the children of the given element with the id of slideshowId,
     * and filters to ensure they all contain the class of slideshowItemClass.
     * Can also be used to fetch the indicators if needed.
     * 
     * @param {string} slideshowId The id of the slideshow containing items
     * @param {string} slideshowItemClass The class for each slideshow item
     * @returns {Array.<HTMLElement>} An array of the slideshow items, useful for constructing a new slideshow
     */
    static getItemsFromElement(slideshowId, slideshowItemClass) {
        // Get children
        var children = Array.from(document.getElementById(slideshowId).children);

        // Filter children
        for (var i = 0; i < children.length; i++) {
            if (!children[i].classList.contains(slideshowItemClass)) {
                children.splice(i, 1);
                i--;
            }
        }

        // Return
        return children;
    }

}