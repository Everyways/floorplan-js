function massSelect(opts) {
    'use strict';
    var defaults = {
        zone: "#wrapper", // ID of the element whith selectables.        
        elements: "a", //  items to be selectable .list-group, #id > .class,'htmlelement' - valid querySelectorAll        
        selectedClass: 'active', // class name to apply to seleted items      
        key: false, //'altKey,ctrlKey,metaKey,false  // activate using optional key     
        moreUsing: 'shiftKey', //altKey,ctrlKey,metaKey   // add more to selection
        enabled: true, //false to .enable() at later time       
        start: null, //  event on selection start
        stop: null, // event on selection end
        onSelect: null, // event fired on every item when selected.               
        onDeselect: null         // event fired on every item when selected.
    };
    var extend = function extend(a, b) {
        for (var prop in b) {
            a[prop] = b[prop];
        }
        return a;
    };
    this.foreach = function (items, callback, scope) {
        if (Object.prototype.toString.call(items) === '[object Object]') {
            for (var prop in items) {
                if (Object.prototype.hasOwnProperty.call(items, prop)) {
                    callback.call(scope, items[prop], prop, items);
                }
            }
        } else {
            for (var i = 0, len = items.length; i < len; i++) {
                callback.call(scope, items[i], i, items);
            }
        }
    }
    this.options = extend(defaults, opts || {});
    this.on = false;
    var self = this;
    this.enable = function () {
        if (this.on) {
            throw new Error(this.constructor.name + " :: is alredy enabled");
            return;
        }
        this.zone = document.querySelector(this.options.zone);
        if (!this.zone) {
            throw new Error(this.constructor.name + " :: no zone defined in options. Please use element with ID");
        }
        this.items = document.querySelectorAll(this.options.zone + ' ' + this.options.elements);
        this.disable(); 

        this.zone.addEventListener('mousedown', self.rectOpen);
        this.on = true;
        return this;
    };
    this.disable = function () {
        this.zone.removeEventListener('mousedown', self.rectOpen);
        this.on = false;
        return this;
    };
    var offset = function (el) {
        var r = el.getBoundingClientRect();
        return {top: r.top + document.body.scrollTop, left: r.left + document.body.scrollLeft}
    };
    this.suspend = function (e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
    this.rectOpen = function (e) {
        // no mass select if pointer on positionned element
        if (!e.target.hasAttribute('draggable')) {            
            self.options.start && self.options.start(e);
            if (self.options.key && !e[self.options.key]) {
                return;
            }
            document.body.classList.add('s-noselect');
            self.foreach(self.items, function (el) {
                el.addEventListener('click', self.suspend, true); //skip any clicks
                if (!e[self.options.moreUsing]) {
                    el.classList.remove(self.options.selectedClass);
                }
            });
            self.ipos = [e.pageX, e.pageY];
            if (!rb()) {
                var gh = document.createElement('div');
                gh.id = 's-rectBox';
                gh.style.left = e.pageX + 'px';
                gh.style.top = e.pageY + 'px';
                document.body.appendChild(gh);
            }
            document.body.addEventListener('mousemove', self.rectDraw);
            window.addEventListener('mouseup', self.select);
        }
    };
    var rb = function () {
        return document.getElementById('s-rectBox');
    };
    var cross = function (a, b) {
        var aTop = offset(a).top, aLeft = offset(a).left, bTop = offset(b).top, bLeft = offset(b).left;
        return !(((aTop + a.offsetHeight) < (bTop)) || (aTop > (bTop + b.offsetHeight)) || ((aLeft + a.offsetWidth) < bLeft) || (aLeft > (bLeft + b.offsetWidth)));
    };
    this.select = function (e) {
        var a = rb();
        if (!a) {
            return;
        }
        delete(self.ipos);
        document.body.classList.remove('s-noselect');
        document.body.removeEventListener('mousemove', self.rectDraw);
        window.removeEventListener('mouseup', self.select);
        var s = self.options.selectedClass;
        var elemnts = [];
        self.foreach(self.items, function (el) {
            if (cross(a, el) === true) {
                if (el.classList.contains(s)) {
                    el.classList.remove(s);
                    self.options.onDeselect && self.options.onDeselect(el);
                } else {
                    // add active class 
                    el.classList.add(s);
                    self.options.onSelect && self.options.onSelect(el);
                    elemnts.push(el);
                }
            }
            setTimeout(function () {
                el.removeEventListener('click', self.suspend, true);
            }, 100);
        });
        a.parentNode.removeChild(a);
        self.options.stop && self.options.stop(e);
        // get User willings
        self.userWillings(elemnts);
    }
    this.userWillings = async function(arrayEl) {
        if (arrayEl.length === 0) { return; }
        var myModal = new SimpleModal("Action!", "Would you prefer to name this bloc or delete these elements?", "Delete elements", "Rename block");
        try {
            const modalResponse = await myModal.question();
            if (modalResponse === true) {
                self.userDeleteAction(arrayEl);
            } else {
                var myText = new SimpleModal("Information", "What will be you text?", "ok", "cancel", true);
                try {
                    const myTextResponse = await myText.question();
                    if (myTextResponse != undefined) {
                        self.userMergeAction(arrayEl, myTextResponse);
                    }
                } catch (err) {
                    console.log(err);
                }
            }
        } catch (err) {
            console.log(err);
        }
    }
    this.userDeleteAction = function (arrayEl) {
        if (arrayEl.length === 0) { return; }
        for (var i = 0; i < arrayEl.length; i++) {
            arrayEl[i].remove();
        }
    }
    this.userMergeAction = function (arrayEl, userText) {
        if (arrayEl.length === 0) { return; }

        var elLines = 0;
        var elIntervalCol = 0;
        var parentZero = arrayEl[0].parentNode;
        // logic suite is i+1
        for (var i = 0; i < arrayEl.length; i++) {
            var numEl = parseInt(arrayEl[i].getAttribute('number'));
            // next line
            if (numEl != lastRef+1) {
                elLines++;
            } 
            // first bloc line
            if (elLines == 1) {
                // count selection length
                if (numEl == lastRef+1) {
                    elIntervalCol++;
                }
            }
            var lastRef = numEl;
            // remove useless td
            if (i > 0) {
                arrayEl[i].parentNode.remove();
            }
        }
        arrayEl[0].remove();
        parentZero.colSpan = elIntervalCol+1;
        parentZero.rowSpan = elLines;
        parentZero.style.backgroundColor = 'yellow';
        parentZero.style.border = 'thin solid #000';
        // Create a new p element with user text
        let p = document.createElement('p');
        p.textContent = userText;
        parentZero.appendChild(p);
        if (elLines > elIntervalCol) {
            parentZero.classList.add('vertical');
        }

    }
    this.rectDraw = function (e) {
        var g = rb();
        if (!self.ipos || g === null) {
            return;
        }
        var tmp, x1 = self.ipos[0], y1 = self.ipos[1], x2 = e.pageX, y2 = e.pageY;
        if (x1 > x2) {
            tmp = x2, x2 = x1, x1 = tmp;
        }
        if (y1 > y2) {
            tmp = y2, y2 = y1, y1 = tmp;
        }
        g.style.left = x1 + 'px', g.style.top = y1 + 'px', g.style.width = (x2 - x1) + 'px', g.style.height = (y2 - y1) + 'px';
    }
    this.options.selectables = this;
    if (this.options.enabled) {
        return this.enable();
    }
    return this;

}


