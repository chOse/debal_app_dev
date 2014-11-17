App
.controller('AppCtrl',
    function($rootScope, $state, $stateParams, $scope, $ionicPlatform, $ionicPopup, $ionicNavBarDelegate, $ionicTabsDelegate, GENERAL_CONFIG, CURRENCIES_LIST, initService, SyncService, LocalStorageService) {

    $rootScope.currencySymbol = function(id) {
        try {
            return CURRENCIES_LIST[id]
                ? CURRENCIES_LIST[id].symbol
                : id;
        }
        catch(e) {
            return id;
        }
    };

    $scope.$on('newEntries', function(event) {
        console.log("// Remove cached entries !!");
        if(typeof($rootScope.cached_balances)!='undefined') {
            for (prop in $rootScope.cached_balances)
                delete $rootScope.cached_balances[prop];

            for (prop in $rootScope.cached_entries) 
                delete $rootScope.cached_entries[prop];
        }
    }); 
    

    // Handle back top-left button
    $scope.goBack = function() {
        if($state.current.name=="app.groupexpenses") {
            if($ionicTabsDelegate.selectedIndex()>0)
                $ionicTabsDelegate.select(0);

            else
                $state.go('app.groups');
        }

        else
            if($state.current.name=="app.groupexpenses")
                $state.go('app.groups');

        else
            $ionicNavBarDelegate.back();
    }

    // Pull to refresh
    $scope.doRefresh = function() {
        SyncService.syncAndRefresh(function(result) {
            $scope.$broadcast('scroll.refreshComplete');
        });
        setTimeout(function() { $scope.$broadcast('scroll.refreshComplete') }, 10000);
    };

    $ionicPlatform.ready(function() {

        var sync_counter = 0;

        $scope.$on('synced', function(event) {
            sync_counter = 0;
        });

        // Auto Sync
        function syncSave() {
            triggerSync(true);
        }

        function sync() {
            sync_counter++;
            trigger_change = 10;            

            if(sync_counter%trigger_change==0)
                triggerSync(false);
            else
                triggerSync(true);
        }

        function back_online() {

            console.log('back online');

            /*
            var app_version = LocalStorageService.get('app_version');
            // RECREATE DB IF APP UPDATED
            if(app_version==='undefined' || (app_version!=GENERAL_CONFIG.APP_VERSION && app_version!='1.1.2') || !LocalStorageService.get('login')) {
                LocalStorageService.clear("login");
                $state.go('login');
            }

            else {*/
                initService.init(function() {
                    console.log("sync inited, will now sync");
                    sync();
                });
           // }
        }

        function triggerSync(saveBandwidth) {
            
            var online = (typeof(navigator.online)!=='undefined') ? navigator.onLine : (typeof(navigator.network)!=='undefined') ? (navigator.network.connection.type != Connection.NONE) : true;
            var logged_in = LocalStorageService.get("login");
            if(online===true && logged_in==="true" /* && $state.current.name!="login" && $state.current.name!="register"*/) {
                console.log("TIMER SYNC AND REFRESH");
                SyncService.syncAndRefresh(function(result) {

                }, saveBandwidth);
            }
        }
        
        setInterval(sync,5000);

        // Auto Sync after going online
        document.addEventListener("online", back_online, false);
        
        if(typeof(cordova)=='undefined') {
            back_online();
        }

    });
});