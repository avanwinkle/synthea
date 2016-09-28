(function() {
'use strict';

angular
    .module('SyntheaApp')
    .controller('SynEditCueController', SynEditCueController);

SynEditCueController.$inject = ['SynChannel','SynProject','$mdDialog','$scope'];

/**
 * Controller for the modal to edit a single cue (includes creating new cues)
 */
function SynEditCueController(SynChannel,SynProject,$mdDialog,$scope) {

    var secVm = this;

    this.SynProject_ = SynProject;
    this.$mdDialog_ = $mdDialog;
    this.$scope_ = $scope;


    // Make a channel to preview sources
    this.channel = new SynChannel();

    // Stop the channel when the modal is closed
    $scope.$on('$destroy', function() {
        // Need to force unload, otherwise the channel will reset and restart
        this.channel.stop({forceUnload:true});
    }.bind(this));

    // The files selected in the file menu are not immediately atteched
    secVm.selectedFiles = [];

    this.activate();
}

/**
 * Activation function fetches the project media list
 */
SynEditCueController.prototype.activate = function() {

    // get the media list
    this.SynProject_.getProjectMediaByAssignment().then(function(response) {
        this.media = response;
        this.mediaList = response.all;
        this.mediaListOnlyUnassigned = false;
    }.bind(this));

    // Make a holding value for the volume
    this.volume_pct = this.cue.volume * 100 || undefined;

    // Do we have a hotkey?
    angular.forEach(this.SynProject_.getProject().hotKeys, function(keyobj,keycode) {
        if (keyobj.cue_id === this.cue.id) {
            this.cue._hotkey = keycode;
        }
    }.bind(this));

};

/**
 * Bind the $mdDialog service cancel method to the view model
 */
SynEditCueController.prototype.$cancel = function() {
    this.$mdDialog_.cancel();
};

/**
 * Bind the $mdDialog service close method to the view model
 */
SynEditCueController.prototype.$close = function() {
    // Set the real volume, if need be
    if (this.volume_pct) {
        this.cue.volume = this.volume_pct / 100;
    }
    // Make the hotkey into an object
    if (this.cue._hotkey) {
        this.cue._hotkey = {
            action: 'PLAY',
            cue_id: this.cue._id,
            _code: this.cue._hotkey
        };
    }

    this.$mdDialog_.hide(this.cue);
};

/**
 * Method to add all selected media files as sources to the opened cue. Will
 * only add files that aren't already sources.
 */
SynEditCueController.prototype.addFilesToCue = function() {

    // Iterate the selection so we don't duplicate files already there
    angular.forEach(this.selectedFiles, function(f) {
        if (this.cue.sources.indexOf(f.name)===-1) {
            this.cue.sources.push(f.name);
        }
    }.bind(this));

    // If we don't have a title for this cue? Let's be nice and make one!
    if (!this.cue.name && this.cue.sources.length) {

        var whitespace = /[_-]/g;
        var leadingnums = /^([0-9\W]*)/;
        var titlecase = /(\b[a-z](?!\s))/g;

        var name = this.cue.sources[0].split('.')[0]
            .replace(whitespace,' ')
            .replace(leadingnums,'')
            .replace(titlecase, function(x){return x.toUpperCase();})
            .trim();

        this.cue.name = name;
    }

};

SynEditCueController.prototype.captureHotkeys = function() {
    // ALready doing? Cancel
    this.showHotkeys = !this.showHotkeys;

    if (!this.showHotkeys) {
        document.removeEventListener('keypress', this.hotkeyListener);
        return;
    }

    this.hotkeyListener = function(e) {
        // Prevent propagation, naturally
        e.preventDefault();
        // Don't allow reserved keys to bind
        switch (e.code) {
            case "Enter":
            case "Space":
                return;
        }

        this.hotkeyCapture = e;

        this.$scope_.$apply();

    }.bind(this);

    document.addEventListener('keypress', this.hotkeyListener);

};

/**
 * Remove all sources from the cue
 */
SynEditCueController.prototype.clearSources = function() {
    this.cue.sources = [];
};

/**
 * Call the SynProject service to add media to the project, and (by default)
 * automatically attach any newly-added media as sources to this cue
 */
SynEditCueController.prototype.copyMediaToProject = function() {

    // Make a copy of the current list so we can see what's added
    var oldList = this.mediaList.map(function(l) {
        return l.name;
    });

    // Use the project's method to open the media selector
    this.SynProject_.copyMediaToProject().then(function() {

        // Re-organize the media by assignment
        this.SynProject_.getProjectMediaByAssignment().then(function(response){
            // AVW: This is duplicated code from activate()
            this.media = response;
            this.mediaList = response.all;
            this.mediaListOnlyUnassigned = false;

            // For clarity, delesect anything that was previously selected
            this.selectedFiles = [];

            // Select anything that's new
            angular.forEach(this.mediaList, function(m) {
                if (oldList.indexOf(m.name)===-1) {
                    this.selectedFiles.push(m);
                }
            }.bind(this));

            // For convenience, assume the newly added media should go to the cue?
            this.addFilesToCue();
            // Since we're selected it, might as well load the player
            // AVW: Commented out because of delay in copying the file!
            // this.selectAssignedMedia('select');
        }.bind(this));

    }.bind(this));
};

/**
 * Delete this cue! Also, closes the modal
 */
SynEditCueController.prototype.deleteCue = function() {
    this.$mdDialog_.hide(null);
};

/**
 * Remove a media file as a source on the cue
 * @param  {string} filename Name of the source file to remove
 */
SynEditCueController.prototype.removeSource = function(filename) {

    if (this.cue.sources.indexOf(filename) !== -1) {
        this.cue.sources.splice(this.cue.sources.indexOf(filename),1);
    }

};

SynEditCueController.prototype.saveHotkeys = function() {

    this.cue._hotkey =
        (this.hotkeyCapture.ctrlKey ? 'Ctrl.':'') +
        (this.hotkeyCapture.altKey ? 'Alt.' : '') +
        (this.hotkeyCapture.shiftKey ? 'Shift.' : '') +
        this.hotkeyCapture.code;

    if (this.hotkeyCapture.altKey) { this.cue._hotkey.accelAlt = true; }
    if (this.hotkeyCapture.ctrlKey) { this.cue._hotkey.accelCtrl = true; }
    if (this.hotkeyCapture.shiftKey) { this.cue._hotkey.accelShift = true; }

    // Destroy the listener
    document.removeEventListener('keypress', this.hotkeyListener);
    // And the boolean
    this.showHotkeys = false;

};

SynEditCueController.prototype.selectAssignedMedia = function(src) {

    // Unselect?
    if (!src) {
        this.selectedAssignedMedia = undefined;
        return;
    }
    // From the multi-select?
    else if (src === 'select') {
        src = this.selectedFiles[0].name;
    }
    // If it's an assigned media, clear the select
    else {
        this.selectedFiles.splice(0);
    }

    this.selectedAssignedMedia = src;

    // Stop! For reals!
    this.channel.stop({forceUnload:true}).then(function() {
        // If no source available, clear out the channel
        if (!src) {
            this.channel.loadCue();
            return;
        }

        this.channel.loadCue({
            _audioRoot: this.SynProject_.getProjectDef().documentRoot + '/audio/',
            isFadeIn: false,
            isLoop: false,
            name: src,
            sources: [src],
        }, {
            dontUnload: true,
            forceFadeOut: false,
        });

    }.bind(this));

};

SynEditCueController.prototype.toggleMediaList = function() {
    this.mediaListOnlyUnassigned = !this.mediaListOnlyUnassigned;

    this.mediaList = this.media[
        this.mediaListOnlyUnassigned ? 'unassigned' : 'all'
    ];
};

SynEditCueController.prototype.updateVolume = function() {
    // Nothing?
    if (!this.volume_pct && this.volume_pct !== 0) {
        this.volume_pct = 100;
    }
    // Coerce the constraints to be valid
    else {
        this.volume_pct = Math.max(0, Math.min(this.volume_pct,200));
    }
    // Change the player volume level without changing the cue
    if (this.channel.media) {
        this.channel.setFullVolume(this.volume_pct);
    }
};

// IIFE
})();