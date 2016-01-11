App.controller('GroupBalanceCtrl',
    function($scope, $state, $ionicPopover) {

    $ionicPopover.fromTemplateUrl('app/templates/groupbalance_popover.html', {
        scope: $scope,
    }).then(function(popover) {
        $scope.popover = popover;
    });

    $scope.openPopover = function($event) {
        $scope.popover.show($event);   
    };

    $scope.$on('$destroy', function() {
        if(typeof $scope.popover != 'undefined')
            $scope.popover.remove();
    });

    $scope.$on('$ionicView.beforeLeave', function(event) {
        if(typeof $scope.popover != 'undefined')
            $scope.popover.remove();
    });

    $scope.trackView();

});