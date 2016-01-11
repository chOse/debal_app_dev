App.factory('EntriesModel', function(SQLiteService, DB_CONFIG, GroupsModel) {

    return {
        read: function(where, callback) {
            var DB = new SQLiteService();
            DB.select("e.EntryId, e.amount, e.date, e.GroupsUserId, e.category_id, e.title, e.id");
            DB.from("entries as e");
            DB.join("groups_users as gu", "e.GroupsUserId = gu.GroupsUserId");
            DB.where("e.deleted = 0");

            for (var i in where) {
                DB.where("e." + i + ' = "' + where[i] + '"');
            }

            DB.order_by("e.date DESC, e.EntryId DESC");
            DB.query(callback);
        },

        get_beneficiaries: function(EntryId, callback) {
            var DB = new SQLiteService();
            DB.select("egu.GroupsUserId, egu.share, egu.shared_amount, egu.id, egu.entry_id, egu.groups_user_id");
            DB.from("entries_groups_users as egu");
            DB.where("EntryId = " + EntryId);

            DB.query(callback);
        },

        save_entry: function(entry_data, beneficiaries_data, callback) {

            var SQL = new SQLiteService();
            var db = SQL.getDb();

            var insert_id = null;

            db.transaction(
                function (tx) {
                    insert("entries", entry_data, tx, function(resultSet) {
                        if (!resultSet.rowsAffected) {
                            return false;
                        }

                        insert_id = resultSet.insertId;

                        // Clean old beneficiaries list
                        tx.executeSql('DELETE FROM entries_groups_users WHERE EntryId = ' + insert_id);

                        for(var i in beneficiaries_data) {
                            !function(i) {
                                beneficiaries_data[i].EntryId = insert_id;
                                insert("entries_groups_users", beneficiaries_data[i], tx);
                            }(i);
                        }

                    }, "OR IGNORE");
                }, callback, function() { callback(insert_id); }
            );
        },

        update_entry: function(entry_data, beneficiaries_data, callback) {

            var SQL = new SQLiteService();
            var db = SQL.getDb();

            var insert_id = entry_data.EntryId;

            db.transaction(
                function (tx) {
                    update("entries", entry_data, tx, "EntryId=" + entry_data.EntryId, function(resultSet) {
                        if (!resultSet.rowsAffected) {
                            return false;
                        }
                        
                        tx.executeSql('DELETE FROM entries_groups_users WHERE EntryId = ' + insert_id);
                        for(var i in beneficiaries_data) {
                            !function(i) {
                                beneficiaries_data[i].EntryId = insert_id;
                                insert("entries_groups_users", beneficiaries_data[i], tx);
                            }(i);
                            
                        }
                    });
                }, callback, function() { callback(insert_id); }
            );
        },

        delete: function(EntryId, callback) {
            var DB = new SQLiteService();
            DB.update("entries", {'deleted':1}, null, "EntryId=" + EntryId, callback);
        },
        
        get : function(where, callback){
            var DB = new SQLiteService();
            DB.select();
            DB.from("entries");
            if(arguments.length === 2)
                for(var i in where)
                    DB.where(i+'="'+where[i]+'"');
            else callback = where;
            DB.query(callback);
        },
        count_user_entries : function(GroupsUserId, callback) {

            var DB = new SQLiteService();

            benefitedCount = function(callback) {
                DB.select('COUNT(DISTINCT EntriesGroupsUserId) as count1');
                DB.from('entries_groups_users as egu');
                DB.join('entries as e', 'e.EntryId = egu.EntryId');
                DB.where('e.deleted = 0');
                DB.where('egu.GroupsUserId = ' + GroupsUserId);
                DB.query(callback);
            };

            spentNotBenefitedCount = function(callback) {
                DB.select('COUNT(DISTINCT e.EntryId) as count2');
                DB.from('entries as e');
                DB.join("entries_groups_users as egu", "egu.EntryId = e.GroupsUserId");
                DB.where('egu.GroupsUserId != ' + GroupsUserId);
                DB.where('e.GroupsUserId = ' + GroupsUserId);
                DB.where('e.deleted = 0');
                DB.query(callback);
            };

            benefitedCount(function(count) {
                var benefited_count = count[0].count1;
                spentNotBenefitedCount(function(count) {
                    var spent_not_benefited_count = count[0].count2;
                    var benefited_total = spent_not_benefited_count + benefited_count;
                    callback(benefited_total);
                });
            });
        },


        calculateBalance : function(group_data, cb) {

            var DB = new SQLiteService();


            getGroupUsers = function() {
                var DB = new SQLiteService();
                DB.select("gu.GroupsUserId");
                DB.from("groups_users as gu");
                DB.where("gu.GroupId = " + GroupId);
                DB.where("gu.deleted = 0");
                DB.query(getGroupBalance);

            };

            getBenefitedByUser = function(guid, callBack) {

                // Benefited by user
                DB.select("SUM(egu.shared_amount) as sum");
                DB.from("entries as e");
                DB.join("entries_groups_users as egu", "e.EntryId = egu.EntryId");
                DB.where("egu.GroupsUserId = " + guid);
                DB.where("e.deleted = 0");

                DB.query(callBack);
            };

            getSpentByUser = function(guid, callBack) {

                // Spent by user
                DB.select("SUM(e.amount) as sum");
                DB.from("entries as e");
                DB.join("groups_users as gu", "e.GroupsUserId = gu.GroupsUserId");
                DB.where("gu.GroupsUserId = " + guid);
                DB.where("e.deleted = 0");

                DB.query(callBack);
            };

            getUserBalance = function(guid, i, callBack) {
                var benefited, spent;

                getBenefitedByUser(guid, function(user_benefited) {
                    benefited = user_benefited[0].sum;
                    getSpentByUser(guid, function(user_spent) {
                        spent = user_spent[0].sum;
                        callBack(guid, i, spent-benefited);
                    });
                });
            };

            var balance = [];

            settle = function(balance) {
                var users_balance = balance.sort(function(a, b) {return a.balance - b.balance;});
                var money_flows = {};
                var ct = users_balance.length;

                for(var i in users_balance) {

                    var giver = users_balance[i];
                    var j = ct - 1;   

                    while(giver.balance<0) {

                        var receiver = users_balance[j];

                        if(receiver == giver)
                            break;

                        if(receiver.balance>0) {

                            var flow_amount = Math.min(Math.abs(giver.balance), receiver.balance);
                            var flow_amount_round = Math.round(flow_amount*100)/100;

                            if(flow_amount_round>0) {
                                if(!money_flows[giver.guid])
                                    money_flows[giver.guid] = [];
                                
                                money_flows[parseInt(giver.guid)].push({'to':receiver.guid, 'amount':flow_amount_round.toFixed(2)});
                            }

                            receiver.balance = receiver.balance - flow_amount;
                            giver.balance = giver.balance + flow_amount;
                        }

                        else
                            j--;
                    }
                }

                cb(money_flows);
            };

            settle_member = function(guid, i, user_balance) {
                balance.push({'guid':guid, 'balance':user_balance});
                if(i==groups_users.length-1)
                    settle(balance);
            };

            getGroupBalance = function(data) {
                groups_users = data.sort(function(a, b) {return a.GroupsUserId - b.GroupsUserId;});

                for (var i in groups_users) {
                    var guid = groups_users[i].GroupsUserId;
                    getUserBalance(guid, i, settle_member);
                }
            };
            getGroupBalance(group_data);
        }

    };
});