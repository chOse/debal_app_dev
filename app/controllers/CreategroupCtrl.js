App
.controller('CreategroupCtrl', function($scope, $rootScope, $state, $location, $ionicPopup, $ionicSideMenuDelegate, $ionicScrollDelegate, gettextCatalog, LocalStorageService, LoaderService, CURRENCIES_LIST, CURRENCIES_DEFAULT, LocalStorageService, GroupsModel, UsersModel) {

    $ionicSideMenuDelegate.canDragContent(false);

    $scope.currencies = CURRENCIES_LIST;
    $scope.group = {shares:false};
    $scope.group.currency = LocalStorageService.get('currency') ? $scope.currencies[LocalStorageService.get('currency')] : $scope.currencies[CURRENCIES_DEFAULT];
    $scope.current_user = {'id':LocalStorageService.get("user_id"), 'share':1, 'current_user':true, 'username':LocalStorageService.get("user_name")};
    $scope.group.members = [$scope.current_user];

    var locale = LocalStorageService.get('locale');
    $scope.locale = (typeof CURRENCIES_LIST["EUR"]["name_" + locale] != 'undefined') ? locale : 'en';

    function checkName(name) {
        for (var i in $scope.group.members) {
            if($scope.group.members[i].username.toLowerCase()==name.toLowerCase())
                return false;
        }
        return true;
    }

    $scope.addShare = function(member) {
        var oldval = parseFloat(member.share);

        if(oldval===0.5) 
            member.share = 1;
        else if(oldval<10)
            member.share = oldval + 0.5;
    };

    $scope.removeShare = function(member) {
        var oldval = parseFloat(member.share);
        if(oldval<=1) 
            member.share = 0.5;
        else 
            member.share = oldval - 0.5;
    };

    $scope.editShare = function(member) {

        $scope.editshare_member = angular.copy(member);
        var myPopup = $ionicPopup.show({
            templateUrl: 'app/templates/edit_user_share.html',
            title: gettextCatalog.getString('{{name}}\'s default share', {name:member.username}),
            scope: $scope,
            buttons: [
                { text: gettextCatalog.getString('Cancel') },
                {
                    text: gettextCatalog.getString('Confirm'),
                    type: 'button-positive',
                    onTap: function(e) {
                        return true;
                    }
                },
            ]
        });
        myPopup.then(function(t) {
            if(t)
                member.share = $scope.editshare_member.share;
            
        });
    }

    $scope.addMember = function() {
        $scope.data = {}

        var myPopup = $ionicPopup.show({
            template: '<input autofocus type="text" class="add-user-input" ng-model="data.username">',
            title: gettextCatalog.getString('Enter member\'s name'),

            scope: $scope,
            buttons: [
                { text: gettextCatalog.getString('Cancel') },
                {
                    text: '<b>' + gettextCatalog.getString('Add') + '</b>',
                    type: 'button-positive',
                    onTap: function(e) {
                        if (!$scope.data.username)
                            e.preventDefault();
                        else
                            return $scope.data.username;
                    }
                },
            ]
        });
        if(typeof(cordova)!='undefined' && typeof(cordova.plugins.Keyboard)!='undefined')
            cordova.plugins.Keyboard.show();

        myPopup.then(function(res) {
            if(typeof(cordova)!='undefined' && typeof(cordova.plugins.Keyboard)!='undefined')
                        cordova.plugins.Keyboard.close();
            if(res) {
                if($scope.data.username && checkName($scope.data.username)) {
                    $ionicScrollDelegate.scrollBottom(true);
                    $scope.group.members.push({username: $scope.data.username, share:1});
                }

                else if(!checkName($scope.data.username)) {
                    var alertPopup = $ionicPopup.alert({
                        title: gettextCatalog.getString('Error'),
                        template: gettextCatalog.getString("Please enter a name that is not already used!")
                    });
                    alertPopup.then(function(res) {
                        $scope.addMember();
                    });
                }
            }
        });
    };

    $scope.validForm = function(callback) {
        if(typeof($scope.group.name)=='undefined') {
            $ionicPopup.alert({
                title: gettextCatalog.getString('Error'),
                template: gettextCatalog.getString("Please enter a name for the group!")
            });
            callback(false);
        }
        else if($scope.group.members.length<2) {
            $ionicPopup.alert({
                title: gettextCatalog.getString('Error'),
                template: gettextCatalog.getString("Please add at least a second member to the group!")
            });
            callback(false);
        }
        else
            callback(true);
    }

    $scope.addGroup = function() {

        var group_members = [];

        $scope.validForm(function(validated) {
            if(validated) {

                // Block Sync While processing
                $rootScope.$broadcast('blockSync');


                var group = {'name':$scope.group.name,'currency':$scope.group.currency.id,'UserId': $scope.current_user.UserId,'user_id':$scope.current_user.id};

                LocalStorageService.set('currency', $scope.group.currency.id);

                for(var i in $scope.group.members) {
                    var c = $scope.group.members[i];
                    group_members.push({
                        users : {
                            username : c.username,
                            UserId : (typeof(c.UserId)!='undefined') ? c.UserId : null,
                            
                        },
                        groups_users : {
                            share : c.share,
                            user_id : (typeof(c.id)!='undefined') ? c.id : null,
                        }
                    })
                }

                GroupsModel.create_group(group, group_members, 
                    function(group_id) {

                        if(typeof group_id != 'undefined' && !isNaN(group_id)) {
                            // unBlock Sync after processing
                            $rootScope.$broadcast('unblockSync');

                            $location.path('app/groupexpenses/' + group_id);
                            $scope.$apply()
                        }

                        else {
                            console.error("Group could not be created");
                        }
                    }
                );
            }
        })
    };

    // Retrieve UserId
    UsersModel.getUserId($scope.current_user.id, function(r) {
        $scope.current_user.UserId = r[0].UserId;
    });

    // Tracking
    if (typeof analytics !== 'undefined')
        analytics.trackView($state.current.name);

});