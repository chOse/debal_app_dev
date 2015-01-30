App.controller('GroupexpensesCtrl',
    function($scope, $stateParams, $rootScope, $state, $ionicSideMenuDelegate, $ionicNavBarDelegate, $location, $ionicTabsDelegate, gettextCatalog, EntriesModel, GroupsModel, CURRENCIES_LIST, CURRENCIES_SYMBOLS, LoaderService, LocalStorageService) {

    $ionicSideMenuDelegate.canDragContent(true);

    $scope.GroupId = $stateParams.GroupId;
    $scope.group_data = [];
    $scope.membersNames = [];

    $scope.locale = LocalStorageService.get("locale");

    $scope.$on('balances.notReady', function() {
        $scope.balances_ready = false;
    })
    $scope.$on('balances.ready', function() {
        $scope.balances_ready = true;
        LoaderService.hide();
    })
    $scope.$on('newEntries', function(event) {
        console.log("en / new data from server");
        setTimeout(function() { console.log("delayed initing group"); $scope.initGroup(true) }, 500);
    });

    $scope.$on('$ionicView.beforeEnter', function(event) {
        //console.error($scope.expenses);
        
    })

    $scope.$on('$ionicView.loaded', function(event) {
        console.error("loading view");
        $scope.initGroup();
    })

    $scope.$on('$stateChangeSuccess', function() {
        $scope.loadMore();
    });

    $scope.goSettings = function() {
        $location.path('app/editgroup/' + $scope.GroupId);
    }

    $scope.addExpense = function() {
        $location.path('app/addexpense/' + $scope.GroupId);
    }


    $scope.getGroupData = function(callback) {
        GroupsModel.read({GroupId: $scope.GroupId}, function(data) {
            $scope.group_data = data[0];
            
            $scope.group_data.currency_symbol = (typeof(CURRENCIES_SYMBOLS[$scope.group_data.currency])!='undefined') ? CURRENCIES_SYMBOLS[$scope.group_data.currency] : $scope.group_data.currency;
            $scope.$apply();
            if(callback) callback();
        });
    };

    var limit_display = 0;
    var max_display = 15;
    $scope.noMoreItems = false;

    $scope.showBalance = function(e) {

        $ionicTabsDelegate.select(1);

        // Clear loaded expenses for faster tab switch
        $scope.expenses_display = $scope.expenses_display.slice(0,limit_display);

        $scope.noMoreItems = false;

        if(!$scope.balances_ready) {
            LoaderService.show();
        }
    }

    // Triggerd automatically for loading expenses on scroll
    $scope.loadMore = function() {
        if(!$scope.expenses)
            $scope.getEntries(function() {
                $scope.loadExpenses();
            })

        else
            $scope.loadExpenses();
    };

    // Get expenses from cache
    $scope.loadExpenses = function() {

        console.log("will load expenses");

        limit_display = Math.min(max_display, $scope.expenses.length)-1;

        if(!$scope.expenses_display)
            $scope.expenses_display = $scope.expenses.slice(0,limit_display);
   
        if(typeof $scope.expenses[$scope.expenses_display.length] != 'undefined')
            $scope.expenses_display.push($scope.expenses[$scope.expenses_display.length]);

        if ($scope.expenses_display.length == $scope.expenses.length)
            $scope.noMoreItems = true;
        
        $scope.$broadcast('scroll.infiniteScrollComplete');
    }

    // Reload expenses cache if table has been updated
    $scope.refreshLoadedExpenses = function(callback, discret) {

        $scope.getEntries(function() {
            var limit_display = Math.min(max_display, $scope.expenses.length)-1;
            var new_display = []
            for(var i=0;i<=limit_display;i++) {
                new_display.push($scope.expenses[i]);
            }
            $scope.expenses_display = new_display;
            callback();
        })

    }

    $scope.getEntries = function(callback) {
        if(!$rootScope.cached_entries)
            $rootScope.cached_entries = [];

        if(!$rootScope.cached_entries['group' + $scope.GroupId]) {
            console.log('cached entries not found');
            EntriesModel.read({GroupId: $scope.GroupId}, function(data) {
                $scope.expenses = data;

                $rootScope.cached_entries['group'+$scope.GroupId] = true;
                console.log('entries have been cached');
                if(callback) callback();
            }, $scope.currentUserGuid);
        }
        
        else {
            console.log('cached entries found');
            //$scope.expenses = $rootScope.cached_entries['group'+$scope.GroupId];
            if(callback) callback();
        }
    };

    $scope.getBalance = function(callback) {

        $scope.$broadcast('balances.notReady');

        if(!$rootScope.cached_balances)
            $rootScope.cached_balances = [];

        if(!$rootScope.cached_balances['group'+$scope.GroupId]) {

            console.log('cached balances not found');
            EntriesModel.calculateBalance($scope.GroupsUserIds, function(balances) {
                $scope.balances = balances;
                $rootScope.cached_balances['group'+$scope.GroupId] = true;
                console.log('balances have been cached');
                $scope.settled = ($scope.expenses.length>0 && objectLength($scope.balances)==0);
                $scope.$broadcast('balances.ready');
                if(callback) callback();
            });
        }
        
        else {
            console.log('cached balances found');
            //$scope.balances = $rootScope.cached_balances['group'+$scope.GroupId];
            //$scope.settled = ($scope.expenses.length>0 && objectLength($scope.balances)==0);
            $scope.$broadcast('balances.ready');
            if(callback) callback();
        }
    }
    $scope.getMembersNames = function(callback) {
        GroupsModel.get_members($scope.GroupId, function(members_names) {

            
            var group_data = [];

            members_names.map(function(arr) {
                if(arr.user_id == LocalStorageService.get("user_id")) {
                    $scope.currentUserGuid = arr.guid;
                }
                $scope.membersNames[arr.guid] = arr.username;
                group_data.push({'GroupsUserId':arr.guid});

            });
            $scope.GroupsUserIds = group_data;
            if(callback) callback();
        });
    }
    $scope.initGroup = function(discret) {

        if(discret)
            LoaderService.show_small();
        else
            LoaderService.show();

        $scope.getGroupData(function() {

            $scope.getMembersNames(function () {

                $scope.refreshLoadedExpenses(function() {

                    $scope.$apply();
                    LoaderService.hide();
                    
                    $scope.getBalance();
                }, discret)
            });
        });
    }
    
    $scope.ShareGroup = function() {
        var text = gettextCatalog.getString('Accounts for group {{name}}', {name:$scope.group_data['name']});
        var url = 'http://www.debal.fr/' + $scope.group_data['public_key'];
        if(typeof window.plugins.socialsharing != 'undefined') {
            window.plugins.socialsharing.share(text, null, null, url);
        }
    }
    $scope.openGroupUrl = function() {
        window.open('http://debal.fr/group/' + $scope.group_data['public_key'] + '/?locale=' + LocalStorageService.get("locale") + '&utm_source=app&utm_medium=balance&utm_campaign=outbound', '_system');
    }

    // Tracking
    if (typeof analytics !== 'undefined')
        analytics.trackView($state.current.name);

});