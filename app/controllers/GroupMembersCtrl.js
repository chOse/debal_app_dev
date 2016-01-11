App
.controller('GroupMembersCtrl', function($scope, $state, $ionicPopup, $ionicPopover, $ionicScrollDelegate, $ionicTabsDelegate, gettextCatalog, GroupsModel) {

    $scope.tabSelectedIndex = $ionicTabsDelegate.selectedIndex();

    /* MEMBER OPTIONS POPOVER */
    $ionicPopover.fromTemplateUrl('app/templates/editgroup_useroptions.html', {
        scope: $scope,
    })
    .then(function(popover) {
        $scope.popover = popover;
    });

    $scope.openPopover = function($event, member, index) {
        $scope.popover.member = angular.copy(member);
        $scope.popover.checkName = checkName;
        $scope.popover.member.index = index;
        $scope.popover.group_id = angular.copy($scope.group.id);
        $scope.popover.show($event);   
    };
    $scope.$on('popover.hidden', function(event) {
        if(typeof($scope.popover.member)!='undefined') {
            $scope.group.members[$scope.popover.member.index] = $scope.popover.member;
        }
    });

    $scope.$on('$destroy', function() {
        if(typeof $scope.popover != 'undefined')
            $scope.popover.remove();
    });

    $scope.$on('$ionicView.beforeLeave', function(event) {
        if(typeof $scope.popover != 'undefined')
            $scope.popover.remove();
        $scope.getGroupAndMembers();
    });
    /* END MEMBER OPTIONS POPOVER */


    function checkName(name) {
        for (var i in $scope.group.members) {
            if($scope.group.members[i].username.toLowerCase()==name.toLowerCase() && $scope.group.members[i].deleted===0)
                return false;
        }
        return true;
    }

    $scope.addMember = function() {
        $scope.data = {};

        var addMemberPopup = $ionicPopup.show({
            template: '<input autofocus placeholder="' + gettextCatalog.getString('Enter a name') + '" type="text" class="add-user-input" ng-model="data.username">',
            title: gettextCatalog.getString('Add new member'),

            scope: $scope,
            buttons: [
                { text: gettextCatalog.getString('Cancel') },
                {
                    text: gettextCatalog.getString('Add'),
                    type: 'button-calm',
                    onTap: function(e) {
                        if (!$scope.data.username)
                            e.preventDefault();
                        else
                            return $scope.data.username;
                    }
                },
            ]
        });

        // Open keyboard
        if(typeof(cordova)!='undefined' && typeof(cordova.plugins.Keyboard)!='undefined')
            cordova.plugins.Keyboard.show();

        addMemberPopup.then(function(res) {

            // Close keyboard
            if(typeof(cordova)!='undefined' && typeof(cordova.plugins.Keyboard)!='undefined')
                cordova.plugins.Keyboard.close();

            if(res) {
                if($scope.data.username && checkName($scope.data.username)) {

                    var user_data = {'username':$scope.data.username};
                    var group_data = {'GroupId':$scope.GroupId,'group_id' : (typeof($scope.group.id)!='undefined') ? $scope.group.id : null};

                    GroupsModel.create_groups_user(user_data, group_data, function(created_gu) {
                        if(typeof created_gu != 'undefined' && created_gu !== null) {
                            $scope.group.members.push({GroupsUserId: created_gu.GroupsUserId, UserId:created_gu.UserId, username: $scope.data.username, share:1, default_share:1, deleted:0});
                            $scope.$apply();
                            $scope.initGroup();
                            $ionicScrollDelegate.scrollBottom(true);
                        }
                    });
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

    $scope.trackView();
});