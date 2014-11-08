App.controller('GroupexpensesCtrl',
    function($scope, $stateParams, $rootScope, $state, $ionicSideMenuDelegate, gettextCatalog, EntriesModel, GroupsModel, CURRENCIES_LIST, LoaderService, LocalStorageService) {

    $ionicSideMenuDelegate.canDragContent(true);

    $scope.GroupId = $stateParams.GroupId;
    $scope.group_data = [];
    $scope.membersNames = [];

    $scope.locale = LocalStorageService.get("locale");


    $scope.$on('newEntries', function(event) {
        console.log("en / new data from server");
        setTimeout(function() { console.log("delayed initing group"); $scope.initGroup(true) }, 500);
    });
    
    $scope.convertcurrency = function(curr) {
        return CURRENCIES_LIST[curr];
    };

    $scope.getGroupData = function(callback) {
        GroupsModel.read({GroupId: $scope.GroupId}, function(data) {
            $scope.group_data = data[0];
            if(callback) callback();
        });
    };
    $scope.getEntries = function(callback) {

        if(!$rootScope.cached_entries)
            $rootScope.cached_entries = [];

        if(!$rootScope.cached_entries['group' + $scope.GroupId]) {
            console.log('cached entries not found');
            EntriesModel.read({GroupId: $scope.GroupId}, function(data) {
                $scope.expenses = data;

                $rootScope.cached_entries['group'+$scope.GroupId] = data;
                console.log('entries have been cached');
                if(callback) callback();
            });
            
        }
        
        else {
            console.log('cached entries found');
            $scope.expenses = $rootScope.cached_entries['group'+$scope.GroupId];
            if(callback) callback();
            
        }
        
    };

    $scope.getBalance = function(callback) {

        if(!$rootScope.cached_balances)
            $rootScope.cached_balances = [];

        if(!$rootScope.cached_balances['group'+$scope.GroupId]) {
            console.log('cached balances not found');

            EntriesModel.calculateBalance($scope.GroupsUserIds, function(balances) {
                $scope.balances = balances;
                $rootScope.cached_balances['group'+$scope.GroupId] = balances;
                console.log('balances have been cached');
                $scope.settled = ($scope.expenses.length>0 && objectLength($scope.balances)==0);
                if(callback) callback();
            });
            
        }
        
        else {
            console.log('cached balances found');
            $scope.balances = $rootScope.cached_balances['group'+$scope.GroupId];
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

                $scope.getEntries(function() {

                    $scope.getBalance(function() {
                        $scope.$apply();
                        LoaderService.hide();
                    });
                });
            });
        });
    }
    
    $scope.initGroup();

    $scope.ShareGroup = function() {
        window.plugins.socialsharing.share({text: gettextCatalog.getString('Comptes du groupe {{name}}', {name:$scope.group_data['name']}), url: 'http://www.debal.fr/' + $scope.group_data['public_key']});
    }
    $scope.openGroupUrl = function() {
        window.open('http://debal.fr/group/' + $scope.group_data['public_key'] + '/?locale=' + LocalStorageService.get("locale") + '&utm_source=app&utm_medium=balance&utm_campaign=outbound', '_system');
    }

    // Tracking
    if (typeof analytics !== 'undefined')
        analytics.trackView($state.current.name);


});