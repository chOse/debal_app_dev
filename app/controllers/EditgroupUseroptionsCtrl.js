App
.controller('EditgroupUseroptionsCtrl', function($scope, $state, $ionicPopup, gettextCatalog, LocalStorageService, LoaderService, GroupsModel, UsersModel, SyncService) {


    $scope.popInvite = function() {

        $scope.popover.hide();

        // TODO : Check internet status

        if(!$scope.popover.member.current_user && !$scope.popover.member.registered && $scope.popover.member.share!=0) {

            $scope.data = {};

            if(!$scope.popover.member.id) {
                $ionicPopup.alert({
                    title: gettextCatalog.getString('Invitation impossible !'),
                    template: gettextCatalog.getString("Le groupe n'a pas encore été synchronisé (connexion à Internet nécessaire)")
                });
            }

            else {
                var myPopup = $ionicPopup.show({
                    //template: '<style>.popup {width:300px !important;}</style><input style="width: 185px;display: inline;" autofocus type="email" ng-model="data.invite_email" class="add-user-input" required="true"><button ng-click="$scope.pickContact()" class="button button-small button-energized icon-left ion-android-contacts">Contacts</button>',
                    template: '<input autofocus type="text" ng-model="data.invite_email" class="add-user-input" required="true">',
                    title: gettextCatalog.getString('Quelle est l\'adresse e-mail de {{name}} ?', {name:$scope.popover.member.username}),
                    scope: $scope,
                    buttons: [
                        { text: gettextCatalog.getString('Annuler') },
                        {
                            text: gettextCatalog.getString('Inviter'),
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
                                        template_msg =  gettextCatalog.getString('{{name}} a été ajouté au groupe', {name:$scope.popover.member.username});
                                    else
                                        template_msg =  gettextCatalog.getString('L\'invitation a bien été envoyée par mail. Si {{name}} ne la reçoit pas, demandez-lui de vérifier son courrier indésirable !', {name:$scope.popover.member.username});
                                    
                                    $ionicPopup.alert({
                                        title: gettextCatalog.getString('Invitation envoyée !'),
                                        template: template_msg
                                    });
                                    GroupsModel.update_groups_user({GroupsUserId:$scope.popover.member.guid, invite_email:$scope.data.invite_email});
                                    UsersModel.delete
                                }

                                else {
                                    LoaderService.hide();
                                    $ionicPopup.alert({
                                        title: gettextCatalog.getString('Erreur'),
                                        template: gettextCatalog.getString('L\'invitation n\'a pas pu être envoyée')
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
                title: gettextCatalog.getString('Quel nouveau nom pour {{name}} ?', {name:$scope.popover.member.username}),
                scope: $scope,
                buttons: [
                    { text: gettextCatalog.getString('Annuler') },
                    {
                        text: gettextCatalog.getString('Valider'),
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
                            title: gettextCatalog.getString('Erreur'),
                            template: gettextCatalog.getString("Veuillez renseigner un nom qui n'est pas déjà utilisé !")
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
            title: gettextCatalog.getString('Part par defaut de {{name}}', {name:$scope.popover.member.username}),
            scope: $scope,
            buttons: [
                { text: gettextCatalog.getString('Annuler') },
                {
                    text: gettextCatalog.getString('Valider'),
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
                var template_text = '<div style="text-align:center">' + gettextCatalog.getString('Votre part par défaut sera mise à 0 et vous <strong>n\'apparaîtrez pas dans les prochaines dépenses</strong>.') + '</div>';


            else if($scope.popover.member.count_total>0) 
                var template_text = '<div style="text-align:center">' + gettextCatalog.getString('{{name}} apparaît dans des dépenses et ne peut être supprimé.<br />Sa part par défaut sera mise à 0 et il/elle <strong>n\'apparaîtra pas dans les prochaines dépenses</strong>.', {name: $scope.popover.member.username }) + '</div>';

            else
                var template_text = gettextCatalog.getString('Supprimer {{name}} du groupe ?', {name: $scope.popover.member.username});

            var confirmPopup = $ionicPopup.confirm({
                title: gettextCatalog.getString('Information'),
                template: template_text,
                buttons: [
                    { text: gettextCatalog.getString('Annuler') },
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