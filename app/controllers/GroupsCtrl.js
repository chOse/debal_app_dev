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
            LoaderService.hide();
        });
    };
    
    $scope.getGroups();

    // Tracking
    if (typeof analytics !== 'undefined')
        analytics.trackView($state.current.name);

});