App.factory('GroupsModel', function(SQLiteService, DB_CONFIG) {

    return {
        read : function(where, callback) {
            var DB = new SQLiteService();
            DB.select();
            DB.from("groups");
            DB.where('deleted = 0');
            if(arguments.length === 2)
                for(var i in where)
                    DB.where(i+' = "'+where[i]+'"');
            else callback = where;
            DB.order_by_desc("groups.GroupId");
            DB.query(callback);
        },

        create_group : function(group_data, members_data, callback) {
            var SQL = new SQLiteService();
            var db = SQL.getDb();

            var group_id = null;

            db.transaction(
                function (tx) {
                    SQL.insert("groups", group_data, tx, function(res1) {
                        // Check result or rollback ?
                        group_id = res1.insertId;

                        for(var i in members_data) {
                            !function (i) {
                                var cu = members_data[i].users;
                                SQL.insert("users", cu, tx, function(res2) {

                                    user_id = cu.UserId ? cu.UserId : res2.insertId;
                                    // Check user_id or rollback 
                                    var cgu = members_data[i].groups_users;
                                    cgu.UserId = user_id;
                                    cgu.GroupId = group_id;

                                    SQL.insert("groups_users", cgu, tx);

                                }, "OR IGNORE"); // Will ignore inserting users with UserId specified (already in Db)
                            }(i)
                        }
                    });
                }, callback, function() { callback(group_id)}
            );
        },
        create_groups_user : function(user_data, group_data, callback) {
            var SQL = new SQLiteService();
            var db = SQL.getDb();

            var created_gu = null;

            db.transaction(
                function(tx) {
                    SQL.insert("users", user_data, tx, function(res1) {

                        var user_id = res1.insertId;

                        created_gu = {
                            'UserId' : user_id,
                            'GroupId' : group_data.GroupId,
                            'group_id' : (typeof(group_data.group_id) != 'undefined') ? group_data.group_id : null
                        }

                        SQL.insert("groups_users", created_gu, tx, function(res2) {
                            created_gu.GroupsUserId = res2.insertId;
                        })
                    })
                }, callback, function() { callback(created_gu) }
            );
        },
        update : function (data, callback){
            (new SQLiteService())
                .update("groups", data, null, "GroupId="+data.GroupId, callback);
        },
        update_groups_user : function (data, callback) {
            console.log(data);
            (new SQLiteService())
                .update("groups_users", data, null, "GroupsUserId="+data.GroupsUserId, callback);
        },

        delete: function(GroupId, callback) {
            (new SQLiteService())
                .update("groups", {'deleted':1}, null, "GroupId=" + GroupId, callback);
        },

        get_members : function(group_id, callback) {
            var DB = new SQLiteService();
            DB.select("gu.GroupsUserId as guid, u.username as username, gu.share as default_share, gu.id, gu.UserId, u.id as user_id, u.email, gu.invite_email");
            DB.from("groups_users as gu");
            DB.join("users as u", "u.UserId = gu.UserId");
            DB.where("gu.deleted = 0");
            DB.where("gu.GroupId = " + group_id);
            DB.order_by("gu.UserId asc");

            DB.query(callback);
        },
        get_members_sharenotzero : function(group_id, callback) {
            var DB = new SQLiteService();
            DB.select("gu.GroupsUserId as guid, u.username as username, gu.share as default_share, gu.id, gu.UserId, u.email, gu.invite_email");
            DB.from("groups_users as gu");
            DB.left_join("users as u", "u.UserId = gu.UserId");
            DB.where("gu.deleted = 0");
            DB.where("gu.share != 0");
            DB.where("gu.GroupId = " + group_id);
            DB.order_by("gu.UserId asc");

            DB.query(callback);
        }
    };
});