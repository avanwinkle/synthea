(function() {

const {ipcRenderer} = require('electron');

angular
    .module('SyntheaApp')
    .controller("SyntheaController", SyntheaController);

SyntheaController.$inject = ['ProjectLoader','$scope','$log'];

function SyntheaController(ProjectLoader, $scope,$log) {

    var sVm = this;

    // The master
    $scope.master = undefined;
    $scope.currentTrack = undefined;

    $scope.projectName = 'BlackFlag';

    activate();


    ipcRenderer.on('open-project', function(event,projectName) {
        loadProject(projectName);
    });

    function loadProject(pName) {

        $scope.projectName = pName;

        ProjectLoader.loadProject(pName).then( function(master) {

            $scope.master = master;
            // All done? Select the first page
            $scope.selectPage( $scope.master.pages[0] );

        });
    }

    $scope.selectPage = function(page) {
        $scope.currentPage = page;
        $scope.currentColumns = $scope.master.columns[page];
        $scope.currentButtons = $scope.master.buttons[page];
    };

    $scope.setAudio = function(button) {
        // $log.info("Setting audio to '"+button.name+"' ("+button.file+")");
        $scope.currentTrack = button;
        document.getElementById('audioplayer').src =
            './Projects/'+$scope.projectName+'/normal/'+button.file;
        document.getElementById('audioplayer').play();
    };

    function activate() {
        loadProject('MMCP');
    }

}

// IIFE
})();