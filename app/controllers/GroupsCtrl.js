App.controller('GroupsCtrl', function($scope, $state, $timeout, $ionicSideMenuDelegate, $ionicModal, $ionicPopup, $ionicLoading, LoginService, gettextCatalog, GroupsModel, GroupRequestsModel, LocalStorageService, SyncService) {

    $ionicSideMenuDelegate.canDragContent(true);

    $scope.user_name = LocalStorageService.get("user_name");
    $scope.showWelcomeMessage = false;


    $scope.$on('newGroups', function(event) {
        console.error("new groups triggered");
        $scope.getGroups(true);
    });

    $scope.$on('openJoinRequests', function(event) {
        $scope.openJoinRequests();   
    });

    $scope.$on('$ionicView.beforeEnter', function(event) {
        $scope.getJoinRequests();
    });

    $scope.goCreategroup = function() {
        $state.go('app.creategroup');
    };

    $scope.openGroup = function(GroupId) {
        $state.go('app.group.tabs.expenses', {GroupId: GroupId});
    };

    $scope.getThumbnailColor = function(groupName) {
        if(typeof groupName === 'undefined')
            return;
        
        var colors = ["#66D8BA","#f16364","#f58559","#f9a43e","#e4c62e","#67bf74","#59a2be","#2093cd","#ad62a7"];

        hashCode = function(strInput) {
            var str = strInput.toUpperCase();
            var hash = 0;
            if (str.length === 0) return hash;
            for (i = 0; i < str.length && i<3; i++) {
                char = str.charCodeAt(i);
                hash = ((hash<<5)-hash)+char;
                hash = hash & hash;
            }
            return hash;
        };
        
        groupName_number = Math.abs(hashCode(groupName)*1)%(colors.length);
        return colors[groupName_number];
    };

    $scope.getJoinRequests = function(callback) {
        $scope.joinrequests = {};
        GroupRequestsModel.read_pending(function(data) {
            $scope.joinrequests.requests = data;
            if(callback) callback();
        });
    };

    $scope.getGroups = function(discret) {
        if(!discret)
            $ionicLoading.show();

        $scope.groups = [];
        getGroupMembers = function(group_data, callback) {
            GroupsModel.get_members_sharenotzero(group_data.GroupId, function(data) {
                var members_list = "";
                var members = [];
                var connector1 = gettextCatalog.getString('with');
                

                for(var i in data) {
                    if(data[i].user_id*1!==LocalStorageService.get('user_id')*1)
                        members.push(data[i].username);
                }
                var last = members[members.length-1];
                members.pop();
                members_list = connector1 + " " + members.join(", ");

                var connector2 = members.length>0 ? gettextCatalog.getString('and') : '';

                group_data.members_list = members_list + " " + connector2 + " " + last;

                callback(group_data);
                
            });
        };

        $scope.getJoinRequests();
        var groups = [];
        GroupsModel.read({}, function(data) {
            for(var i in data) {
                getGroupMembers(data[i], function(group_data) {
                    groups.push(group_data);
                    if(i==data.length-1) {
                        if($scope.groups !== groups)
                            $scope.groups = groups;
                        $scope.$apply();
                    }
                });
            }
            $scope.showWelcomeMessage = (data.length===0);
            $scope.$apply();
            $ionicLoading.hide();
        });
    };



    /* Join request Modal */
    $ionicModal.fromTemplateUrl('app/templates/joinrequest_modal.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function(modal) {
        $scope.modal = modal;
    });  

    $scope.openJoinRequests = function() {
        $scope.modal.show();
    };
    $scope.closeModal = function() {
        $scope.modal.hide();
        SyncService.syncAndRefresh(function() {
            $scope.getGroups();
        });
    };

    $scope.$on('$destroy', function() {
        $scope.modal.remove();
        
    });

    $scope.joinRequest = {request : null, groupMembers: null };

    $scope.acceptRequest = function(index) {

        $scope.joinRequest.selected_index = index;
        var groupRequest = $scope.joinrequests.requests[index];
        $scope.joinRequest.request = groupRequest;
        $scope.joinRequest.selected_member = null;

        GroupsModel.get_members_synced_not_registered(groupRequest.GroupId, function(data) {
            var dym_input = groupRequest.username;
            var dym_list = data;
            var dym_key = 'username';
            didYouMean.returnWinningObject = true;
            var dym_match = didYouMean(dym_input, dym_list, dym_key);
           
            $scope.joinRequest.groupMembers = data;
            for(var i in data) {
                if (dym_match===data[i])
                    $scope.selectMember(i);
            }
            
            $scope.$apply();
        });

        $scope.joinRequest.popup = $ionicPopup.show({
            templateUrl: 'app/templates/popup_joinrequest_selectmember.html',
            title: gettextCatalog.getString('Select member to merge'),
            scope: $scope,
            buttons: [
                { 
                    text: gettextCatalog.getString('Cancel')
                },
                { 
                    text: gettextCatalog.getString('Confirm'),
                    type: 'button-calm', 
                    onTap: $scope.assignMember
                }
            ]
        });

    };

    $scope.selectMember = function(index) {
        var members = angular.copy($scope.joinRequest.groupMembers);
        $scope.joinRequest.selected_member = index;
        for(var i in members) {
            members[i].selected = false;
        }
        if(typeof(members[index])!='undefined') {
            members[index].selected = true;
            $scope.joinRequest.selected_member = index;
        }

        $scope.joinRequest.groupMembers = members;
    };


    $scope.denyRequest = function(index) {

        var confirmPopup = $ionicPopup.confirm({
            title:  gettextCatalog.getString('Confirm'),
            template: gettextCatalog.getString('Are you sure you want to deny this request?')
        });
        confirmPopup.then(function(res) {
            if(res) {
                $scope.joinRequest.selected_index = index;
                var groupRequest = $scope.joinrequests.requests[index];
                $scope.joinRequest.request = groupRequest;
                $scope.joinRequest.selected_member = "rejected";
                $scope.assignMember(null);
            }
        });
    };

    $scope.removeRequestByIndex = function(index) {
        var joinrequests = angular.copy($scope.joinrequests.requests);
        joinrequests.splice(index,1);
        GroupRequestsModel.delete($scope.joinrequests.requests[index].GroupRequestId, function() {
            $scope.joinrequests.requests = joinrequests;
        });
    };

    $scope.assignMember = function(e) {
        if ($scope.joinRequest.selected_member===null)
            e.preventDefault();

        else {
            // api_send value
            var data = {
                data: {
                    group_request_id : $scope.joinRequest.request.id,
                    groups_user_id : isNaN($scope.joinRequest.selected_member) ? $scope.joinRequest.selected_member : $scope.joinRequest.groupMembers[$scope.joinRequest.selected_member].groups_user_id
                }
            };
            var msg = "";
            var requester = $scope.joinRequest.request.username;
            switch($scope.joinRequest.selected_member) {
                case 'rejected':
                    msg = gettextCatalog.getString("<b>{{requester}}</b> has been <b>denied access</b> to the group", {requester:requester});
                    break;
                case 'new':
                    msg = gettextCatalog.getString("<b>{{requester}}</b> has been <b>added</b> to the group!", {requester:requester});
                    break;
                default:
                    var merged_with = $scope.joinRequest.groupMembers[$scope.joinRequest.selected_member].username;
                    msg = gettextCatalog.getString("<b>{{requester}}</b> has been <b>granted access</b> to the group as <b>{{merged_with}}</b>", {requester:requester, merged_with:merged_with});
            }

            $ionicLoading.show();

            SyncService.api_send("handle_join_request", data, function(data, status) {

                $ionicLoading.hide();

                if(status==200 && typeof data.result !== 'undefined') {
                    if(data.result=="OK") {
                        $ionicPopup.alert({
                            title: gettextCatalog.getString('Done !'),
                            template: msg
                        });

                        $scope.removeRequestByIndex($scope.joinRequest.selected_index);
                        SyncService.syncAndRefresh(function() {
                            $scope.getGroups();
                        });

                    }
                    else if(data.result=="ERROR") {
                        switch(data.data) {
                            case 'no_such_pending_request':
                                msg = gettextCatalog.getString("This request has already been dealt with! We'll remove it from your list.");
                                $scope.removeRequestByIndex($scope.joinRequest.selected_index);
                                break;
                            case 'not_authorized':
                                msg = gettextCatalog.getString("You are not authorized to deal with this request!");
                                $scope.removeRequestByIndex($scope.joinRequest.selected_index);
                                break;
                            default:
                                msg = gettextCatalog.getString("The request could not be dealt with at this time. Please try again or contact support team.");
                        }

                        

                        $ionicPopup.alert({
                            title: gettextCatalog.getString('Oops !'),
                            template: msg
                        });
                    }
                }
                else {
                    $ionicPopup.alert({
                        title: gettextCatalog.getString('Oops !'),
                        template: gettextCatalog.getString("The request could not be dealt with. Please check your internet status and try again.")
                    });
                }
            });
        }
    };

    /* End Join request Modal */
    if(LoginService.isLogged()==="true") {
        $scope.getGroups();
        $scope.trackView();
    }

});