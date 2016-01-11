App.controller('GroupExpensesCtrl',
    function($scope, $state, $ionicPopup, $ionicNavBarDelegate, gettextCatalog) {

    $ionicNavBarDelegate.showBackButton(true);

    $scope.addExpense = function() {
        $state.go('app.group.addexpense');
    };

    $scope.editExpense = function(EntryId) {
        $state.go('app.group.editexpense', {EntryId:EntryId});
    };

    $scope.showIconTip = function(expense) {

        var msg = "";
        var css_class = "";

        if(expense.GroupsUserId == $scope.currentUserGuid) {
            msg = gettextCatalog.getString('This color indicates that <strong>you paid</strong> for this expense.');
            css_class = "paid_by_me";
        }
        else if (expense.current_user_in_expense) {
            msg = gettextCatalog.getString('This color indicates that <strong>you are included</strong> in this expense.');
            css_class = "includes_me";
        }

        else {
            msg = gettextCatalog.getString('This color indicates that <strong>you did not pay nor are included</strong> in this expense.');
            css_class = "";
        }

        var alertPopup = $ionicPopup.alert({
            cssClass : 'expenseIconTip',
            title: gettextCatalog.getString('What is that color for?'),
            template: '<i class="glyphicons glyphicons-list-alt expense_icon ' + css_class + '"></i>' + msg
        });
    };

    $scope.trackView();

});