App.controller('GroupsCtrl', function($scope, $state, $ionicSideMenuDelegate, GroupsModel, LocalStorageService, LoaderService) {

    

    $ionicSideMenuDelegate.canDragContent(true);
    
    $scope.groups = [];

    $scope.user_name = LocalStorageService.get("user_name");

    $scope.$on('newGroups', function(event) {

        console.log("GETTINGR OUUUPPSP");
        $scope.getGroups(true);
    });


    $scope.getGroups = function(discret) {
        if(discret)
            LoaderService.show_small();
        else
            LoaderService.show();

        console.log("GETTING GROUPS");
        console.log(discret);

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