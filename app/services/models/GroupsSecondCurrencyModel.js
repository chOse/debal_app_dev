App.factory('GroupsSecondCurrencyModel', function(SQLiteService, DB_CONFIG, LocalStorageService) {

    return {
        read : function(GroupId, callback) {
            var DB = new SQLiteService();
            DB.select("gsc.*");
            DB.from("groups_second_currency as gsc");
            DB.where('GroupId=' + GroupId);
            DB.query(callback);
        },

        delete : function(GroupId, callback) {
            (new SQLiteService())
                .remove("groups_second_currency", "GroupId="+GroupId, callback);
        },

        set_second_currency : function (GroupId, second_currency, rate, callback) {
            (new SQLiteService())
                .insert("groups_second_currency", {'GroupId':GroupId, 'second_currency':second_currency, 'rate':rate}, null, callback, 'OR REPLACE');
        }
    };
});