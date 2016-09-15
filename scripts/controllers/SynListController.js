(function() {
'use strict';

angular
    .module('SyntheaApp')
    .controller('SynListController', SynListController);

SynListController.$inject = ['$mdDialog','$timeout'];

function SynListController($mdDialog,$timeout) {

    var slVm = this;

    this.$timeout_ = $timeout;

    this.$cancel = $mdDialog.cancel;
    this.$hide = $mdDialog.hide;
}


SynListController.prototype.addListItem = function() {
    // We only need an empty object
    this.list.push({});

    // Throw focus
    this.$timeout_(function() {
        var c = document.getElementById('manageListItemsList').children;
        c.item(c.length-1).getElementsByTagName('input')[0].focus();
    },100);
};

SynListController.prototype.deleteListItem = function(idx) {
    this.list.splice(idx,1);
};

SynListController.prototype.saveListItems = function() {
    // Drag and drop creates NEW COPIES of objects, so we can't
    // just modify in place. Instead, make an array of section ids
    var newOrder = this.list.map(function(s) {
        // New list don't have ids, just names
        return s.id || s._newname;
    });
    // Return this array of ids/names to the controller, which will
    // match the ids against the original section objects and
    // propagate modifications to those originals
    this.$hide({list: this.list, order: newOrder});
};

SynListController.prototype.activate = function() {
    // Set temporary names for changing
    angular.forEach(this.list, function(l) {
        l._newname = l.name;
    });

    // Sort them according to their display_order, because the modal
    // shows them in actual array index order
    this.list.sort(function(a,b) {
        return a.display_order >= b.display_order;
    });

    // If we don't have anything in the list yet, be nice and add one
    if (this.list.length === 0) {
        // Wait for the modal to be fully rendered
        console.log('adding list item');
        this.addListItem();
    }

};


// IIFE
})();