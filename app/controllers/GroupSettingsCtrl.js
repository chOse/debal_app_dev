App
.controller('GroupSettingsCtrl', function($scope, $state, $stateParams, $location, $ionicPopup, gettextCatalog, LocalStorageService, CURRENCIES_LIST, GroupsModel) {

    $scope.$on('newGroups', function(event) {
        console.log("en / new data from server");
        $scope.initGroup(true);
    });

    var locale = LocalStorageService.get('locale');
    
    $scope.locale_curr = (typeof CURRENCIES_LIST.EUR["name_" + locale] != 'undefined') ? locale : 'en';

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
    };



    

    $scope.editGroup = function() {
        $scope.validForm(function(validated) {
            if(validated) {
                var group = {
                    GroupId:$scope.GroupId,
                    name:$scope.group.name,
                    currency:$scope.group.currency.id,
                    private: $scope.group.private
                };
                LocalStorageService.set('currency', $scope.group.currency.id);
                // Update group 
                GroupsModel.update(group, function() {
                    $scope.$apply();
                });
            }
        });
    };

    $scope.deleteGroup = function() {
        var confirmPopup = $ionicPopup.confirm({
            title: gettextCatalog.getString('Confirm deleting group'),
            template: gettextCatalog.getString('This group and all related expenses will be permanently removed. This will affect all members connected to the group!'),
            buttons: [
                { text: gettextCatalog.getString('Cancel'), onTap: function(e) { return false; } },
                { text: '<b>' + gettextCatalog.getString('Confirm') + '</b>', type: 'button-calm', onTap: function(e) { return true; } },
            ]
        });
        
        confirmPopup.then(function(res) {
            if(res) {
                GroupsModel.delete($scope.GroupId, function() {
                    var alertPopup = $ionicPopup.alert({
                        title: gettextCatalog.getString('Group deleted'),
                        template: gettextCatalog.getString('The group was correctly deleted.')
                    });
                    alertPopup.then(function(res) {
                        $state.go('app.groups');
                    });
                });
            }
        });
    };

    $scope.trackView();
});