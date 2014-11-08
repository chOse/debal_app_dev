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
        create : function(data, callback){

            if(is_array(data) && data.length > 0) {
                console.log("batch insert");
                (new SQLiteService())
                    .batch_insert("groups", data, callback);
            }
            else if(objectLength(data) && objectLength(data) > 0) {
                console.log("insert");
                (new SQLiteService()).insert("groups", data, callback);
            }
            else
                if(is_set(callback))
                    callback();
        },
        create_groups_user : function(member, callback) {
            var DB = new SQLiteService();
            DB.insert("groups_users", member, callback);
        },
        create_groups_users : function(members, callback) {
            var DB = new SQLiteService();
            for (var i in members) {
                var k = i;
                DB.insert("groups_users", members[i], function() {
                    if(k==members.length-1)
                        callback();
                });
                
            }
        },
        insert_or_replace_groups_users : function(members, callback) {
            var DB = new SQLiteService();

            console.log("starting " + members.length);

            execute = function(i, callback) {

                if(i==members.length-1) {
                    DB.insert_on_duplicate_update("groups_users", 'GroupsUserId', members[i], callback);
                }
                else {
                    DB.insert_on_duplicate_update("groups_users", 'GroupsUserId', members[i]);
                }
            };

            for (i=0; i<members.length; i++) {
                execute(i, callback);
            }
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
        },

        
        update : function (data, callback){
            (new SQLiteService())
                .update("groups", data, "GroupId="+data.GroupId, callback);
        },
        update_groups_user : function (data, callback) {
            console.log(data);
            (new SQLiteService())
                .update("groups_users", data, "GroupsUserId="+data.GroupsUserId, callback);
        },
        remove: function(GroupId, callback) {
            (new SQLiteService())
                .remove("groups", "GroupId=" + GroupId, callback);
        },

        delete: function(GroupId, callback) {
            (new SQLiteService())
                .update("groups", {'deleted':1}, "GroupId=" + GroupId, callback);
        }
    
    };

});