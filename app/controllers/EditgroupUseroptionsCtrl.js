App
.controller('EditgroupUseroptionsCtrl', function($scope, $state, $ionicPopup, gettextCatalog, LocalStorageService, LoaderService, GroupsModel, UsersModel, SyncService) {


    $scope.popInvite = function() {

        $scope.popover.hide();

        // TODO : Check internet status

        if(!$scope.popover.member.current_user && !$scope.popover.member.registered && $scope.popover.member.share!=0) {

            $scope.data = {};

            if(!$scope.popover.member.id) {
                $ionicPopup.alert({
                    title: gettextCatalog.getString('Unable to invite!'),
                    template: gettextCatalog.getString("You need to sync the group first. (Internet required)")
                });
            }

            else {
                var myPopup = $ionicPopup.show({
                    template: '<input autofocus type="text" ng-model="data.invite_email" class="add-user-input" required="true">',
                    title: gettextCatalog.getString('Please enter {{name}}\'s email address', {name:$scope.popover.member.username}),
                    scope: $scope,
                    buttons: [
                        { text: gettextCatalog.getString('Cancel') },
                        {
                            text: gettextCatalog.getString('Invite'),
                            type: 'button-positive',
                            onTap: function(e) {
                                console.log($scope.data.invite_email);
                                if ($scope.data.invite_email.length<6) {
                                    e.preventDefault();
                                }
                                else {
                                    return true;
                                }
                            }
                        },
                    ]
                });
                myPopup.then(function(res) {
                    if(res) {
                        if(validateEmail($scope.data.invite_email)) {
                            LoaderService.show();
                            var dataToSend = {
                                data: {
                                    email: $scope.data.invite_email,
                                    groups_user_id: $scope.popover.member.id,
                                    group_id: $scope.popover.group_id
                                }
                            };
                            SyncService.api_send('invite_user', dataToSend, function(data, status) {
                                if(status==200 && data.result=="OK" && data.data) {
                                    $scope.popover.member.invite_email = $scope.data.invite_email;
                                    $scope.popover.member.invited = true;
                                    LoaderService.hide();
                                    if(data.data == "joined")
                                        template_msg =  gettextCatalog.getString('{{name}} has been added to the group', {name:$scope.popover.member.username});
                                    else
                                        template_msg =  gettextCatalog.getString('Invitation has been sent to {{name}} by email. If they don\'t receive it, ask them to check their junk mailbox !', {name:$scope.popover.member.username});
                                    
                                    $ionicPopup.alert({
                                        title: gettextCatalog.getString('Invitation has been sent!'),
                                        template: template_msg
                                    });
                                    GroupsModel.update_groups_user({GroupsUserId:$scope.popover.member.guid, invite_email:$scope.data.invite_email});
                                }

                                else {
                                    LoaderService.hide();
                                    $ionicPopup.alert({
                                        title: gettextCatalog.getString('Error'),
                                        template: gettextCatalog.getString('Invitation could not be sent')
                                    });
                                }

                            })
                        }
                    }
                });
            }
        }
    };
/*
    $scope.pickContact = function() {

        ContactsService.pickContact().then(
            function(contact) {
                /*
                var displayName = contact.displayName;
                var emails = contact.emails; (.type/.value)
                var photo = contact.photos[0].value;
                //$scope.data.selectedContacts.push(contact);
                console.log("Selected contacts=");
                console.log($scope.data.selectedContacts);

            },
            function(failure) {
                console.log("Bummer.  Failed to pick a contact");
            }
        );
    }*/

    

        
    $scope.renameUser = function() {

        $scope.popover.hide();

        if(!$scope.popover.member.current_user && !$scope.popover.member.registered && $scope.popover.member.share!=0) {

            $scope.data = {}

            var myPopup = $ionicPopup.show({
                template: '<input autofocus type="text" ng-model="data.username" class="add-user-input" required="true">',
                title: gettextCatalog.getString('Enter a new name for {{name}}', {name:$scope.popover.member.username}),
                scope: $scope,
                buttons: [
                    { text: gettextCatalog.getString('Cancel') },
                    {
                        text: gettextCatalog.getString('Save'),
                        type: 'button-positive',
                        onTap: function(e) {
                            if (!$scope.data.username)
                                e.preventDefault();
                            else
                                return $scope.data.username
                        }
                    },
                ]
            });
            myPopup.then(function(res) {

                if(res) {
                    if($scope.popover.checkName($scope.data.username)) {
                        $scope.popover.member.username = $scope.data.username;
                        // Update table
                        UsersModel.update({'username':$scope.data.username,'UserId': $scope.popover.member.UserId});
                    }
                    
                    else {
                        var alertPopup = $ionicPopup.alert({
                            title: gettextCatalog.getString('Error'),
                            template: gettextCatalog.getString("Please fill a name that is not already used!")
                        });
                        alertPopup.then(function(res) {
                            $scope.renameUser();

                        });
                    }
                }
            });
        }
    };

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

    $scope.editShare = function() {
        $scope.popover.hide();
        $scope.editshare_member = angular.copy($scope.popover.member);
        var myPopup = $ionicPopup.show({
            templateUrl: 'app/templates/edit_user_share.html',
            title: gettextCatalog.getString('Default share for {{name}}', {name:$scope.popover.member.username}),
            scope: $scope,
            buttons: [
                { text: gettextCatalog.getString('Cancel') },
                {
                    text: gettextCatalog.getString('Save'),
                    type: 'button-positive',
                    onTap: function(e) {
                        return true;
                    }
                },
            ]
        });
        myPopup.then(function(t) {
            if(t) {
                $scope.popover.member.share = $scope.editshare_member.share;
                // Update table
                GroupsModel.update_groups_user({'GroupsUserId': $scope.popover.member.guid,'share': $scope.popover.member.share});
            }
            
        });
    }

    $scope.removeUser = function() {

        $scope.popover.hide();

        if($scope.popover.member.share!=0) {

            if($scope.popover.member.current_user)
                var template_text = '<div style="text-align:center">' + gettextCatalog.getString('Your default share will be set to 0 and you <strong>won\'t be displayed in further entries</strong>.') + '</div>';


            else if($scope.popover.member.count_total>0) 
                var template_text = '<div style="text-align:center">' + gettextCatalog.getString('{{name}} is listed in some entries and thus couldn\'t be removed.<br />Their default share was set to 0 and they <strong>won\'t be displayed in further entries</strong>.', {name: $scope.popover.member.username }) + '</div>';

            else
                var template_text = gettextCatalog.getString('Remove {{name}} from group?', {name: $scope.popover.member.username});

            var confirmPopup = $ionicPopup.confirm({
                title: gettextCatalog.getString('Information'),
                template: template_text,
                buttons: [
                    { text: gettextCatalog.getString('Cancel') },
                    {
                        text: gettextCatalog.getString('OK'),
                        type: 'button-positive',
                        onTap: function(e) {
                            return true
                        }
                    },
                ]
            });
           
            confirmPopup.then(function(res) {
                if(res) {
                    if($scope.popover.member.current_user || $scope.popover.member.count_total>0) {
                        $scope.popover.member.share = 0;
                        console.log("member removed");
                        // Update SQL
                        GroupsModel.update_groups_user({GroupsUserId:$scope.popover.member.guid, share:0});
                    }

                    else if(typeof($scope.popover.member.guid)!='undefined' && $scope.popover.member.guid!==null && !isNaN($scope.popover.member.guid)) {
                        $scope.group.members[$scope.popover.member.index].deleted = 1;
                        // Update SQL
                        GroupsModel.update_groups_user({GroupsUserId:$scope.popover.member.guid, deleted:1});
                    }

                }
            });
        }
    }



    // Tracking
    if (typeof analytics !== 'undefined')
        analytics.trackView($state.current.name);

});