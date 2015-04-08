/* global App */

App
.controller('AppCtrl',
    function($rootScope, $state, $scope, $ionicHistory, $ionicNavBarDelegate, $ionicTabsDelegate, SyncService, LocalStorageService, SUPPORTED_LANG) {

        
    $scope.$on('newEntries', function(event) {
        console.log("// Remove cached entries !!");
        if(typeof($rootScope.cached_balances)!=='undefined') {
            for (var prop in $rootScope.cached_balances)
                delete $rootScope.cached_balances[prop];

            for (var prop in $rootScope.cached_entries) 
                delete $rootScope.cached_entries[prop];
        }
    }); 

    // Handle back top-left button
    $scope.goBack = function() {
        if($state.current.name==="app.groupexpenses") {
            if($ionicTabsDelegate.selectedIndex()>0)
                $ionicTabsDelegate.select(0);

            else
                $state.go('app.groups');
        }

        else
            if($state.current.name==="app.groupexpenses")
                $state.go('app.groups');

        else
            $ionicHistory.goBack();
    };

    // Pull to refresh
    $scope.doRefresh = function() {
        SyncService.syncAndRefresh(function(result) {
            $scope.$broadcast('scroll.refreshComplete');
        });
        setTimeout(function() { $scope.$broadcast('scroll.refreshComplete'); }, 10000);
    };

    $scope.device_lang = LocalStorageService.get("locale");
        
    if(SUPPORTED_LANG.indexOf($scope.device_lang)===-1)
        $scope.device_lang = "en";
});