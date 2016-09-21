(function() {
'use strict';

angular
    .module('SyntheaApp')
    .controller('SynMediaController', SynMediaController);

SynMediaController.$inject = ['SynChannel','SynProject','$filter','$mdDialog','$scope'];

function SynMediaController(SynChannel,SynProject,$filter,$mdDialog,$scope) {
    var smVm = this;
    this.SynChannel_ = SynChannel;
    this.SynProject_ = SynProject;
    this.$filter_ = $filter;

    this.$cancel = $mdDialog.cancel;
    this.$hide = $mdDialog.hide;

    // Stop playback if this controller is destroyed
    $scope.$on('$destroy', function() {
        this.channel.stop();
    }.bind(this));

    this.activate();
}

SynMediaController.prototype.activate = function() {

    // Get the project
    this.project = this.SynProject_.getProject();
    // Make a list of all cue media
    this.cueMedia = {};
    angular.forEach(this.project.cues, function(c) {
        for (var i=0;i<c.sources.length;i++) {
            // Is this the first cue for this source?
            if (!this.cueMedia[c.sources[i]]) {
                this.cueMedia[c.sources[i]] = [];
            }
            this.cueMedia[c.sources[i]].push(c);
        }
    }.bind(this));

    // Get all the media
    this._processMediaFiles();

    // Make a channel so we can preview
    this.channel = new this.SynChannel_({
        // Force the player to skip the fade process
        isFadeIn: false,
        name:'__COMMON__'
    });

};

SynMediaController.prototype.addMedia = function() {
    // We can't use the pass in from copy-media because it's
    // just the names and we need the full objects here
    this.SynProject_.copyMediaToProject()
        .then(this._processMediaFiles.bind(this));
};

SynMediaController.prototype.deleteMedia = function() {
    this.SynProject_.deleteMedia(this.selectedMedia.name)
        // Update the media list, including our size tallies
        .then(this._processMediaFiles.bind(this));
};

/**
 * Wrap the deleteCue method so we can update the view when it completes
 * @param  {[type]} cue [description]
 * @return {[type]}     [description]
 */
SynMediaController.prototype.goDeleteCue = function(cue) {

    // Splice it out
    var idx = this.selectedMedia._assignedCues.indexOf(cue);
    if (idx!==-1) {
        this.selectedMedia._assignedCues.splice(idx,1);
    }

    // Call the delete method that was passed in from seVm
    this.deleteCue(cue);

};

SynMediaController.prototype.selectMedia = function() {

    // For now, only one selectable (but 'multiple') for the UX
    this.selectedMedia = this.mediaSelector[0];

    // Load the media up in a channel
    this.channel.stop({forceUnload:true}).then(function() {

        if (!this.selectedMedia) { return; }

        // Mock out a cue object and load it into the channel
        this.channel.loadCue({
            _audioRoot: this.SynProject_.getProjectDef().documentRoot + '/audio/',
            isFadeIn: false,
            name: this.selectedMedia.name,
            sources: [this.selectedMedia.name],
        },{
            dontUnload: true,
            forceFadeOut: false,
        });
    }.bind(this));


    if (!this.selectedMedia) { return; }

    // Find the locations of its cues
    // WOW IS THIS INEFFICIENT!

    // Get all the page names
    var page_ids = {};
    angular.forEach(this.project.pages, function(p) {
        page_ids[p.id] = p.name;
    }.bind(this));

    angular.forEach(this.selectedMedia._assignedCues, function(c) {

        // Reset the deletion
        c._confirmDelete = false;

        // Get all the sections
        var sections = this.$filter_('filter')(this.project.sections, function(s){
            return (s.cue_ids.indexOf(c.id)!==-1);
        }.bind(this));

        // Store them
        c._ancestry = sections.map(function(s) {
            return {section: s.name, page: page_ids[s.page_id]};
        });

    }.bind(this));
};

SynMediaController.prototype.showFile = function() {
    this.SynProject_.showFile( this.selectedMedia.name);
};


SynMediaController.prototype._processMediaFiles = function() {

    this.SynProject_.getProjectMediaList(true)
    .then(function(medialist) {

        this.mediaList = medialist;
        this.mediaSize = 0;
        // Track media that's NOT in a cue
        this.unassignedMedia = [];
        this.assignedMedia = [];
        angular.forEach(this.mediaList, function(m) {
            if (!this.cueMedia[m.name]) {
                this.unassignedMedia.push(m);
            }
            else {
                // Store the name as assigned
                this.assignedMedia.push(m);
                // The list of assigned cues
                m._assignedCues = this.cueMedia[m.name];
            }
            this.mediaSize += m.stats.size;
        }.bind(this));

    }.bind(this));

};


// IIFE
})();