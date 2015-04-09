App.controller('GroupsCtrl', function($scope, $state, $location, $ionicSideMenuDelegate, GroupsModel, LocalStorageService, LoaderService) {

    $ionicSideMenuDelegate.canDragContent(true);
    
    $scope.groups = [];

    $scope.user_name = LocalStorageService.get("user_name");

    $scope.$on('newGroups', function(event) {
        $scope.getGroups(true);
    });

    $scope.goCreategroup = function() {
        $location.path('app/creategroup');
    }


    $scope.getGroups = function(discret) {
        if(discret)
            LoaderService.show_small();
        else
            LoaderService.show();

        GroupsModel.read({}, function(data) {
            $scope.groups = data;
            console.error(data);
            LoaderService.hide();
        });
    };

    $scope.getThumbnailColor = function(groupName) {

        if(typeof groupName === 'undefined')
            return;
        
        var colors = ["#66D8BA","#f16364","#f58559","#f9a43e","#e4c62e","#67bf74","#59a2be","#2093cd","#ad62a7"];

        hashCode = function(str) {
            var str = str.toUpperCase();
            var hash = 0;
            if (str.length == 0) return hash;
            for (i = 0; i < str.length && i<3; i++) {
                char = str.charCodeAt(i);
                hash = ((hash<<5)-hash)+char;
                hash = hash & hash;
            }
            return hash;
        };

        groupName_number = Math.abs(hashCode(groupName)*1)%(colors.length);

        return colors[groupName_number];
    }
    
    $scope.getGroups();

    // Tracking
    if (typeof analytics !== 'undefined')
        analytics.trackView($state.current.name);

});