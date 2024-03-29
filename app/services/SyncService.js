App.service('SyncService', function(API_ROUTES, GENERAL_CONFIG, $state, $rootScope, $ionicPopup, $timeout, $http, gettext, LocalStorageService) {

    this.current_api_call = [];

    this.block_sync = false;

    var self = this;

    $rootScope.$on('blockSync', function(event) {
        console.error("received block Sync");
        setTimeout(function() { self.block_sync = false; }, self.syncTimeout); // Same timeout as $http's
        self.block_sync = true;
    });

    $rootScope.$on('unblockSync', function(event) {
        console.error("received unblock Sync");
        self.block_sync = false;
    });

    this.syncTimeout = 25000;

    this.api_send = function(method, data, callback) {

        var self = this;

        self.syncTimeout = (method=="sync" && self.firstSync===true) ? 100000 : 25000;

        if(this.current_api_call.indexOf(method)===-1 && !this.block_sync) {

            this.current_api_call.push(method);

            var APIData = API_ROUTES[method];

            var ajaxdata = {
                url: GENERAL_CONFIG.API_URL + APIData.url,
                method: APIData.type,
                timeout: self.syncTimeout,
                data : {}
            };

            if(method=="auth") {
                ajaxdata.headers = {
                    'Authorization': "Basic " + btoa(data.email + ":" + data.password)
                };
            }

            else
                ajaxdata.data = data;
            
            if (APIData.auth) {
                ajaxdata.headers = {
                    'Authorization': "Basic " + LocalStorageService.get("user_basic")
                };
            }

            if(ajaxdata.method==="POST" && typeof ajaxdata.data.info == 'undefined') {
                ajaxdata.data.info = {
                    locale:LocalStorageService.get("locale"),
                    version:LocalStorageService.get("app_version")
                }
            }
            
            $http(ajaxdata)
                .error(function(data, status) {

                    self.current_api_call.splice(self.current_api_call.indexOf(method), 1);

                    callback(data, status);

                    if(status==401 && method!="auth" && LocalStorageService.get('login')) {

                        var alertPopup = $ionicPopup.alert({
                            title: gettext('Error'),
                            template: gettext("Your connection credentials are no longer valid. You will be disconnected.")
                        });
                        
                        alertPopup.then(function(res) {
                            LocalStorageService.clear('login');
                            $state.go('login');
                        });   
                    }
                })
                .success(function(data, status) {

                    if(method=="sync")
                        $rootScope.$broadcast('synced');

                    self.current_api_call.splice(self.current_api_call.indexOf(method), 1);

                    callback(data, status);
                });
        }

        else {
            console.error(method + " is already processing or sync is blocked... ignoring request");
            callback([], 0);
        }
    };

   

    this.sync_now = function(callback, saveBandwidth) {

        var username = LocalStorageService.get("user_email");
        var password = LocalStorageService.get("user_password");

        clientData = {'username': username, 'password': password};

        this.syncNow(this.callBackSyncProgress, clientData, callback, saveBandwidth);
    };

    this.syncAndRefresh = function(callback, saveBandwidth) {

        var self = this;

        if(typeof(this.syncStarted)!='undefined' && this.syncStarted===true)
            console.error("SYNC ALREADY STARTED");

        else {

            this.syncStarted = true;
            this.sync_now(function(r) {

                self.syncStarted = false;

                if(r.syncOK) {
                    if(callback)
                        callback(true);

                    if(r.localDataUpdated) {
                        $rootScope.$broadcast('newGroups');
                        $rootScope.$broadcast('newEntries');
                    }
                }

                else {
                    callback(false);
                }
            }, saveBandwidth);
        } 
    };

    this.callBackSyncProgress = function(message, percent, msgKey) {
        $rootScope.$broadcast('syncProgress', percent);
    };


    this.syncStarted = false,
    this.serverUrl = null,
    this.db = null,
    this.tablesToSync = [],//eg.  [{tableName : 'myDbTable', idName : 'myTable_id'},{tableName : 'stat'}]
    this.idNameFromTableName = {}, //map to get the idName with the tableName (key)
    this.serverIdNameFromTableName = {},
    this.syncInfo = {//this object can have other useful info for the server ex. {deviceId : "XXXX", email : "fake@g.com"}
        lastSyncDate : null// attribute managed by webSqlSync
    },
    this.syncResult = null,
    this.firstSync = false,
    this.cbEndSync = null,
    this.clientData = null,
    this.serverData = null,
    
    this.username = null, // basic authentication support
    this.password = null;
    /*
    this.modified_groupsusers_serverids = [];
    this.modified_entries_serverids = [];
    */


    /*************** PUBLIC FUNCTIONS ********************/
    /**
     * Initialize the synchronization (should be called before any call to syncNow)
     * (it will create automatically the necessary tables and triggers if needed)
     * @param {Object} theTablesToSync : ex : [{ tableName: 'card_stat', idName: 'card_id'}, {tableName: 'stat'}] //no need to precise id if the idName is "id".
     * @param {Object} dbObject : the WebSQL database object.
     * @param {Object} theSyncInfo : will be sent to the server (useful to store any ID or device info).
     * @param {Object} theServerUrl
     * @param {Object} callBack(firstInit) : called when init finished.
     * @param {Object} username : username for basci authentication support
     * @param {Object} password : password for basci authentication support
     */
    this.initSync = function(theTablesToSync, dbObject, theSyncInfo, theServerUrl, callBack, username, password) {
        var self = this, i = 0;
        this.db = dbObject;
        this.serverUrl = theServerUrl;
        this.tablesToSync = theTablesToSync;
        this.syncInfo = theSyncInfo;
        this.username=username;
        this.password=password;
        
        //Handle optional id :
        for (i = 0; i < self.tablesToSync.length; i++) {
            if (typeof self.tablesToSync[i].idName === 'undefined') {
                self.tablesToSync[i].idName = 'id';//if not specified, the default name is 'id'
            }
            self.idNameFromTableName[self.tablesToSync[i].tableName] = self.tablesToSync[i].idName;
            self.serverIdNameFromTableName[self.tablesToSync[i].tableName] = self.tablesToSync[i].serverId;
        }

        self.db.transaction(function(transaction) {
            //create new table to store modified or new elems
            self._executeSql('CREATE TABLE IF NOT EXISTS new_elem (table_name TEXT NOT NULL, id TEXT NOT NULL);', [], transaction);
            self._executeSql('CREATE INDEX IF NOT EXISTS index_tableName_newElem on new_elem (table_name)', [], transaction);
            self._executeSql('CREATE TABLE IF NOT EXISTS sync_info (last_sync TIMESTAMP);', [], transaction);

            //create triggers to automatically fill the new_elem table (this table will contains a pointer to all the modified data)
            for (i = 0; i < self.tablesToSync.length; i++) {
                var curr = self.tablesToSync[i];
                if(curr.trigger===true) {
                    self._executeSql('CREATE TRIGGER IF NOT EXISTS update_' + curr.tableName + '  AFTER UPDATE ON ' + curr.tableName + ' ' +
                        'BEGIN INSERT INTO new_elem (table_name, id) VALUES ("' + curr.tableName + '", new.' + curr.idName + '); END;', [], transaction);

                    self._executeSql('CREATE TRIGGER IF NOT EXISTS insert_' + curr.tableName + '  AFTER INSERT ON ' + curr.tableName + ' ' +
                            'BEGIN INSERT INTO new_elem (table_name, id) VALUES ("' + curr.tableName + '", new.' + curr.idName + '); END;', [], transaction);
                }
                
            }
        });//end tx
        self._selectSql('SELECT last_sync FROM sync_info', null, function(res) {

            //First sync (or data lost)
            if (res.length === 0 || res[0] == 0) {
                self._executeSql('INSERT OR REPLACE INTO sync_info (last_sync) VALUES (0)', []);
                self.firstSync = true;
                self.syncInfo.lastSyncDate = 0;

                // Get exchange rates
                $http({method: 'GET', url: GENERAL_CONFIG.CURR_RATES_URL}).success(function(data, status) {
                    if(status===200 && typeof data !== 'undefined' && objectLength(data)>0 && typeof fx !== "undefined" && fx.rates) {
                        LocalStorageService.set("exchange_rates", JSON.stringify(data.rates));
                        LocalStorageService.set("exchange_timestamp", data.timestamp);
                        LocalStorageService.set("exchange_base", data.base);
                    }
                });

                callBack(true);
            }

            else {
                self.syncInfo.lastSyncDate = res[0].last_sync;
                if (self.syncInfo.lastSyncDate === 0) {
                    self.firstSync = true;
                }
                callBack(false);
            }
        });
    };

    /**
     *
     * @param {function} callBackProgress
     * @param {function} callBackEnd (result.syncOK, result.message).
     * @param {boolean} saveBandwidth (default false): if true, the client will not send a request to the server if there is no local changes
     */
    this.syncNow = function(callBackProgress, clientData, callBackEndSync, saveBandwidth) {

        this.syncInfo.locale = LocalStorageService.get("locale");
        this.syncInfo.version = LocalStorageService.get("app_version");
        
        var self = this;

        this.username=clientData.username;
        this.password=clientData.password;
        

        if (this.db === null) {
            throw 'You should call the initSync before (db is null)';
        }

        self.syncResult = {syncOK: false, codeStr: 'noSync', message: 'No Sync yet', nbSent : 0, nbUpdated:0};

        self.cbEndSync = function() {
            callBackProgress(self.syncResult.message, 100, self.syncResult.codeStr);
            callBackEndSync(self.syncResult);
        };

        self.process = function() {

            callBackProgress('Getting local data to backup', 0, 'getData');

            self._getDataToBackup(function(data) {
                self.clientData = data;

                if (saveBandwidth && self.syncResult.nbSent === 0) {

                    self.syncResult.localDataUpdated = false;
                    self.syncResult.syncOK = true;
                    self.syncResult.codeStr = 'nothingToSend';
                    self.syncResult.message = 'No new data to send to the server';
                    self.cbEndSync(self.syncResult);
                    return;
                } 

                callBackProgress('Sending ' + self.syncResult.nbSent + ' elements to the server', 20, 'sendData');

                self._sendDataToServer(data, function(serverData) {

                    callBackProgress('Updating local data', 70, 'updateData');

                    self._updateLocalDb(serverData, function() {
                        self.syncResult.localDataUpdated = self.syncResult.nbUpdated > 0;
                        self.syncResult.syncOK = true;
                        self.syncResult.codeStr = 'syncOk';
                        self.syncResult.message = 'Data synchronized successfully. ('+self.syncResult.nbSent+
                            ' new/modified element saved, '+self.syncResult.nbUpdated+' updated)';
                        self.syncResult.serverAnswer = serverData;//include the original server answer, just in case
                        self.cbEndSync(self.syncResult);
                    });
                });
            });
        };

        // Preventive fix : add missing server id when needed (this should not happen but we never know) before proceeding to sync
        self.db.transaction(function(tx) {
            for(var k in this.tablesToSync) {
                var table = this.tablesToSync[k];
                for(var m in table.associations) {
                    var tName = table.associations[m];
                    self._executeSql('UPDATE ' + table.tableName + ' SET ' + self.serverIdNameFromTableName[tName] + ' = (SELECT id from ' + tName + ' WHERE ' + self.idNameFromTableName[tName] + ' = ' + table.tableName + '.' + self.idNameFromTableName[tName] + ' AND ' + tName + '.id IS NOT NULL) WHERE ' + self.serverIdNameFromTableName[tName] + ' IS NULL', [], tx);
                }
            }
        }, function() { console.error("error fixing server ids"); return; }, self.process);
    };

    this.log = function(message) {
        console.log(message);
    };
    this.error = function(message) {
        console.error(message);
    };
    this.getLastSyncDate  = function() {
        return this.syncInfo.lastSyncDate;
    };
    // Usefull to tell the server to resend all the data from a particular Date (val = 1 : the server will send all his data)
    this.setSyncDate = function(val) {
        this.syncInfo.lastSyncDate = val;
        this._executeSql('UPDATE sync_info SET last_sync = "'+this.syncInfo.lastSyncDate+'"', []);
    };
    //Useful to tell the client to send all his data again (like the firstSync)
    this.setFirstSync = function(callback) {
        this.firstSync = true;
        this.syncInfo.lastSyncDate = 0;
        this._executeSql('UPDATE sync_info SET last_sync = "'+this.syncInfo.lastSyncDate+'"', [], null, callback);
    };
    /*************** PRIVATE FUNCTIONS ********************/

    this._getDataToBackup = function(callBack) {
        var self = this, nbData = 0;
        self.log('_getDataToBackup');
        var dataToSync = {
            info: self.syncInfo,
            data: {}
        };

        self.db.transaction(function(tx) {
            var i, counter = 0, nbTables = self.tablesToSync.length, currTable;

            self.tablesToSync.forEach(function(currTable) {//a simple for will not work here because we have an asynchronous call inside

                // Do not send data from "syncWay down" tables
                if(typeof currTable.syncWay=='undefined' || (typeof currTable.syncWay!='undefined' && currTable.syncWay!='down')) {
                    self._getDataToSave(currTable.tableName, currTable.idName, self.firstSync, tx, function(data) {
                        dataToSync.data[currTable.tableName] = data;
                        nbData += data.length;
                        counter++;
                        if (counter === nbTables) {//only call the callback at the last table
                            self.log('Data fetched from the local DB');
                            self.syncResult.nbSent = nbData;
                            callBack(dataToSync);
                        }
                    });
                }
                else {
                    counter++;
                    if (counter === nbTables) {//only call the callback at the last table
                        self.log('Data fetched from the local DB');
                        self.syncResult.nbSent = nbData;
                        callBack(dataToSync);
                    }
                }
                
            });//end for each
        });//end tx
    };

    this._getDataToSave = function(tableName, idName, needAllData, tx, dataCallBack) {
        var self = this, sql = '';
        if (needAllData) {
            sql = 'SELECT * FROM ' + tableName;
        }
        else {
            sql = 'SELECT * FROM ' + tableName + ' WHERE ' + idName + ' IN (SELECT DISTINCT id FROM new_elem WHERE table_name="' + tableName + '")';
        }
        self._selectSql(sql, tx, dataCallBack);
    };


    this._sendDataToServer = function(dataToSync, callBack) {

        var self = this;

        self.api_send('sync', dataToSync, function(data, status) {
            if(status===200 && data instanceof Object)
                callBack(data);

            else {
                data = {
                    result : 'ERROR',
                    status : status,
                    message : 'error'
                };
                callBack(data);
            }
        });
    };

    this._updateLocalDb = function(serverData, callBack) {
        var self = this;
        self.serverData = serverData;

        // SYNC OK, UPDATE ROWS
        if(serverData && typeof serverData.result != 'undefined' && serverData.result === 'OK' && typeof serverData.data != 'undefined' && objectLength(serverData.data)>0) {
            self.db.transaction(function(tx) {
                var counterNbTable = 0, nbTables = self.tablesToSync.length;
                var counterNbElm = 0;
                var ServerIdsToDelete = []; // Server ids to delete from trigger
                var updatedEntriesIds = [];

                self.ModifiedServerIds = [];

                while(self.ModifiedServerIds.length > 0) {
                    self.ModifiedServerIds.pop();
                }

                self.tablesToSync.forEach(function(table) {
                    self.ModifiedServerIds[table.tableName] = [];
                    var currData = serverData.data[table.tableName];
                    if (!currData) {
                        //Should always be defined (even if 0 elements)
                        //Must not be null
                        currData = [];
                    }
                    var nb = currData.length;
                    counterNbElm += nb;
                    self.log('There are ' + nb + ' new or modified elements in the table ' + table.tableName + ' to save in the local DB');

                    var i = 0, listIdToCheck = [], listServerIdToCheck = [];

                    ServerIdsToDelete[table.tableName] = [];

                    for (i = 0; i < nb; i++) {
                        var local_id = serverData.data[table.tableName][i][table.idName];
                        var server_id = serverData.data[table.tableName][i]['id'];

                        if(typeof(local_id)!='undefined')
                            listIdToCheck.push(local_id);

                        else {
                            
                            listServerIdToCheck.push(server_id);
                            ServerIdsToDelete[table.tableName].push(server_id);
                        }

                        self.ModifiedServerIds[table.tableName].push(server_id);


                        if(table.tableName=="entries_groups_users") {
                            if(typeof(serverData.data[table.tableName][i]['EntriesGroupsUserId'])==='undefined')
                                updatedEntriesIds.push(serverData.data[table.tableName][i]['entry_id']);
                        } 

                    }

                    insertOrUpdateFields = function(nb, tableName, idName, listIdToCheck, listServerIdToCheck) {

                        self._getIdExitingInDB(tableName, idName, listIdToCheck, listServerIdToCheck, tx, function(idInDb, serverIdInDb) {
                            
                            var curr = null, sql = null;

                            for (i = 0; i < nb; i++) {

                                curr = serverData.data[tableName][i];
            
                                // Local id specified then update
                                if (idInDb[curr[idName]]) {//update
                                    /*ex : UPDATE "tableName" SET colonne 1 = [valeur 1], colonne 2 = [valeur 2]*/
                                    sql = self._buildUpdateSQL(tableName, curr);
                                    sql += ' WHERE ' + idName + ' = "' + curr[idName] + '"';
                                    self._executeSql(sql, [], tx);
                                }

                                // Local id not specified but server id is in db then update
                                else if (serverIdInDb[curr['id']]) {//update
                                    sql = self._buildUpdateSQL(tableName, curr);
                                    sql += ' WHERE id = "' + curr['id'] + '"';
                                    self._executeSql(sql, [], tx);
                                }

                                // Otherwise insert
                                else {
                                    var attList = self._getAttributesList(curr);
                                    sql = self._buildInsertSQL(tableName, curr, attList);
                                    var attValue = self._getMembersValue(curr, attList);
                                    self._executeSql(sql, attValue, tx);

                                }

                            }//end for

                            counterNbTable++;

                            // Callback at the end
                            if (counterNbTable === nbTables) {
                                //TODO set counterNbElm to info
                                self.syncResult.nbUpdated = counterNbElm;
                                self._finishSync(serverData.syncDate, ServerIdsToDelete, counterNbElm, tx, callBack);
                            }
                        });//end getExisting Id
                    }; // end insertOrUpdateFields

                    // Only for egu : clean previous egus for updated entries (delete is not supported)
                    if(table.tableName=="entries_groups_users") {

                        var SQL = 'SELECT EntriesGroupsUserId FROM entries_groups_users WHERE entry_id IN ("' + self._arrayToString(updatedEntriesIds, '","') + '")';

                        var delete_from_trigger = [];
                        self._selectSql(SQL, tx, function(ids) {

                            for (var i = 0; i < ids.length; ++i) {
                                delete_from_trigger.push(ids[i]['EntriesGroupsUserId']);
                            }

                            // DELETE FROM EntriesGroupsUser WHERE EntriesGroupsUserId IN (GrousUserIds)
                            self._executeSql('DELETE FROM entries_groups_users WHERE entry_id IN("' + self._arrayToString(updatedEntriesIds, '","') + '")', [], tx, function() {
                                self._executeSql('DELETE FROM new_elem WHERE table_name = "entries_groups_users" AND id IN("' + self._arrayToString(delete_from_trigger, '","') + '")', [], tx);
                                insertOrUpdateFields(nb, table.tableName, table.idName, listIdToCheck, listServerIdToCheck);  
                            });
                        });
                    }
                    else
                        insertOrUpdateFields(nb, table.tableName, table.idName, listIdToCheck, listServerIdToCheck);
                });//end forEach
            });//end tx
        }

        // SYNC OK, EMPTY RESPONSE
        else if (serverData.result === 'OK' && (typeof serverData.data === 'undefined' || objectLength(serverData.data) === 0)) {
            //nothing to update
            self.db.transaction(function(tx) {

                //We only use the server date to avoid dealing with wrong date from the client
                self._finishSync(serverData.syncDate, [], 0, tx, callBack);
            });
            return;
        }

        // ANY OTHER CASE > ERROR
        //if (!serverData || serverData.result === 'ERROR' || serverData.result !== 'OK') {
        else {
            console.error("sync ERROR");
            self.syncResult.syncOK = false;
            self.syncResult.codeStr = 'syncKoServer';
            if (serverData) {
                self.syncResult.message = serverData.message;
            }
            else {
                self.syncResult.message = 'No answer from the server';
            }
            self.cbEndSync(self.syncResult);
            return;
        }
    };
    /** return the listIdToCheck curated from the id that doesn't exist in tableName and idName
     * (used in the DBSync class to know if we need to insert new elem or just update)
     * @param {Object} tableName : card_stat.
     * @param {Object} idName : ex. card_id.
     * @param {Object} listIdToCheck : ex. [10000, 10010].
     * @param {Object} dataCallBack(listIdsExistingInDb[id] === true).
     */
    this._getIdExitingInDB = function(tableName, idName, listIdToCheck, listServerIdToCheck, tx, dataCallBack) {

        if (listIdToCheck.length === 0 && listServerIdToCheck.length === 0) {
            dataCallBack([]);
            return;
        }
        var self = this;
        var SQL = 'SELECT ' + idName + ' FROM ' + tableName + ' WHERE ' + idName + ' IN ("' + self._arrayToString(listIdToCheck, '","') + '")';
        self._selectSql(SQL, tx, function(ids) {
            var idsInDb = [];
            for (var i = 0; i < ids.length; ++i) {
                idsInDb[ids[i][idName]] = true;
            }

            var serverIdsInDb = [];

            // Check if row was already in table then update OR insert
            
            var SQL2 = 'SELECT id FROM ' + tableName + ' WHERE id IN ("' + self._arrayToString(listServerIdToCheck, '","') + '")';

            self._selectSql(SQL2, tx, function(ids2) {

                for (var i = 0; i < ids2.length; ++i) {
                    serverIdsInDb[ids2[i]['id']] = true;
                }

                dataCallBack(idsInDb, serverIdsInDb);
            });
        });
    };

    this._finishSync = function(syncDate, ServerIdsToDelete, counterNbElm, tx, callBack) {
        var self = this, tableName, idsToDelete, idName, i, idValue, idsString;
        
        if(counterNbElm>0) {
            this.tablesToSync.forEach(function(table) {
                table.associations.forEach(function(tName) {

                    // Fix local association ids after received data from server, based upon server's association ids
                    console.log("Updating " + table.tableName + " with missing association ids");
                    console.log('UPDATE ' + table.tableName + ' SET ' + self.idNameFromTableName[tName] + ' = (SELECT ' + self.idNameFromTableName[tName] + ' from ' + tName + ' WHERE id=' + table.tableName + '.' + self.serverIdNameFromTableName[tName] + ' AND ' + tName + '.' + self.idNameFromTableName[tName] + ' IS NOT NULL) WHERE ' + self.idNameFromTableName[tName] + ' IS NULL');
                    self._executeSql('UPDATE ' + table.tableName + ' SET ' + self.idNameFromTableName[tName] + ' = (SELECT ' + self.idNameFromTableName[tName] + ' from ' + tName + ' WHERE id=' + table.tableName + '.' + self.serverIdNameFromTableName[tName] + ' AND ' + tName + '.' + self.idNameFromTableName[tName] + ' IS NOT NULL) WHERE ' + self.idNameFromTableName[tName] + ' IS NULL', [], tx);

                    // Preventive fix : add missing server id when needed (this should not happen but we never know)
                    console.log("Updating " + table.tableName + " with missing association server ids");
                    console.log('UPDATE ' + table.tableName + ' SET ' + self.serverIdNameFromTableName[tName] + ' = (SELECT id from ' + tName + ' WHERE ' + self.idNameFromTableName[tName] + ' = ' + table.tableName + '.' + self.idNameFromTableName[tName] + ' AND ' + tName + '.id IS NOT NULL) WHERE ' + self.serverIdNameFromTableName[tName] + ' IS NULL');
                    self._executeSql('UPDATE ' + table.tableName + ' SET ' + self.serverIdNameFromTableName[tName] + ' = (SELECT id from ' + tName + ' WHERE ' + self.idNameFromTableName[tName] + ' = ' + table.tableName + '.' + self.idNameFromTableName[tName] + ' AND ' + tName + '.id IS NOT NULL) WHERE ' + self.serverIdNameFromTableName[tName] + ' IS NULL', [], tx);

                    // Fix changes in association local ids from server
                    if(self.ModifiedServerIds[table.tableName].length>0) {
                        console.log("Updating " + table.tableName + " with changing association ids 2");
                        console.log('UPDATE ' + table.tableName + ' SET ' + self.idNameFromTableName[tName] + ' = (SELECT ' + self.idNameFromTableName[tName] + ' from ' + tName + ' WHERE id = ' + table.tableName + '.' + self.serverIdNameFromTableName[tName] + ') WHERE id IN ("' + self._arrayToString(self.ModifiedServerIds[table.tableName], '","') + '")');
                        self._executeSql('UPDATE ' + table.tableName + ' SET ' + self.idNameFromTableName[tName] + ' = (SELECT ' + self.idNameFromTableName[tName] + ' from ' + tName + ' WHERE id = ' + table.tableName + '.' + self.serverIdNameFromTableName[tName] + ') WHERE id IN ("' + self._arrayToString(self.ModifiedServerIds[table.tableName], '","') + '")', [], tx);
                    }
                });
            });
        }

        // Update sqlite_seq
        if(typeof self.serverData.sqlseq !== 'undefined')
            self.updateSQLiteSeq(self.serverData.sqlseq, tx);
 

        // Listen to new Join Request
        if(typeof self.serverData.data.groups_requests !== 'undefined' && objectLength(self.serverData.data.groups_requests)>0) {
            for(var i in self.serverData.data.groups_requests) {
                var req = self.serverData.data.groups_requests[i];
                if(req.status*1 ===0) {
                    $rootScope.$broadcast('newJoinRequest');
                    break;
                }
            }
        }

        // Listen to changes on current user
        var SQL = 'SELECT id,username,email from users WHERE id =' + LocalStorageService.get("user_id");
        self._selectSql(SQL, tx, function(values) {
            if(values.length>0) {
                LocalStorageService.set('user_name', values[0].username);
                LocalStorageService.set('user_email', values[0].email);
            }
        });

        this.syncInfo.lastSyncDate = syncDate;
        this._executeSql('UPDATE sync_info SET last_sync = "' + syncDate + '"', [], tx);

        // Remove only the elem sent to the server (in case new_elem has been added during the sync)
        // We don't do that anymore: this._executeSql('DELETE FROM new_elem', [], tx);
        for (tableName in self.clientData.data) {
            idsToDelete = new Array();
            idName =  self.idNameFromTableName[tableName];
            for (i=0; i < self.clientData.data[tableName].length; i++) {
                idValue = self.clientData.data[tableName][i][idName];
                idsToDelete.push('"'+idValue+'"');
            }
            if (idsToDelete.length > 0) {
                idsString = self._arrayToString(idsToDelete, ',');
                self._executeSql('DELETE FROM new_elem WHERE table_name = "'+tableName+'" AND id IN ('+idsString+')', [], tx);
            }
        }
        // Remove elems received from the server that has triggered the SQL TRIGGERS, to avoid to send it again to the server and create a loop
        for (tableName in self.serverData.data) {
            idsToDelete = new Array();
            idName =  self.idNameFromTableName[tableName];
            for (i=0; i < self.serverData.data[tableName].length; i++) {
                idValue = self.serverData.data[tableName][i][idName];
                if(idValue!=undefined) {
                    idsToDelete.push('"'+idValue+'"');
                }
            }
            if (idsToDelete.length > 0) {
                idsString = self._arrayToString(idsToDelete, ',');
                self._executeSql('DELETE FROM new_elem WHERE table_name = "'+tableName+'" AND id IN ('+idsString+')', [], tx);
            }
            // Delete also ids from server data without any local id specified
            if(ServerIdsToDelete[tableName].length > 0) {
                serverIdsString = self._arrayToString(ServerIdsToDelete[tableName], ',');
                self._executeSql('DELETE FROM new_elem WHERE table_name = "'+tableName+'" AND id IN (SELECT '+idName+' from '+tableName+' where id IN ('+serverIdsString+'))', [], tx);
            }
        }

        // Remove elements that are missing servers ids (sync failed for some reason, removing those elements ensures data consistency)
        var i = 0;
        for (tableName in self.clientData.data) {
            i++;
            self._executeSql('DELETE FROM "'+tableName+'" WHERE id IS NULL', [], tx);
        }

        callBack();
        this.firstSync = false;
        self.clientData = null;
        self.serverData = null;
    };

    this.updateSQLiteSeq = function(sqlseq, tx) {
        var sql = 'SELECT name,seq FROM sqlite_sequence';

        self._selectSql(sql, tx, function(res) {

            for (var i = 0; i < res.length; ++i) {
                if(typeof sqlseq[res[i]['name']] != 'undefined' && sqlseq[res[i]['name']].length>0) {
                    if(sqlseq[res[i]['name']]>res[i]['seq']) {
                        console.error("edit " + res[i]['name'] + ' with seq = ' + sqlseq[res[i]['name']]);
                        self._executeSql('UPDATE sqlite_sequence SET seq = ' + sqlseq[res[i]['name']] + ' WHERE name = "' + res[i]['name'] + '"', [], tx);
                    }
                }
            }
        });
    };


    /***************** DB  util ****************/

    this._selectSql = function(sql, optionalTransaction, callBack) {
        var self = this;
        self._executeSql(sql, [], optionalTransaction, function(tx, rs) {
        callBack(self._transformRs(rs));
        }, self._errorHandler);
    };
    this._transformRs = function(rs) {
        var elms = [];
        if (typeof(rs.rows) === 'undefined') {
            return elms;
        }

        for (var i = 0; i < rs.rows.length; ++i) {
            elms.push(rs.rows.item(i));
        }
        return elms;
    };

    this._executeSql = function(sql, params, optionalTransaction, optionalCallBack) {
        var self = this;
        self.log('_executeSql: ' + sql + ' with param ' + params);
        if (!optionalCallBack) {
            optionalCallBack = self._defaultCallBack;
        }
        if (optionalTransaction) {
            self._executeSqlBridge(optionalTransaction, sql, params, optionalCallBack, self._errorHandler);
        } else {
            self.db.transaction(function(tx) {
                self._executeSqlBridge(tx, sql, params, optionalCallBack, self._errorHandler);
            });
        }
    };
    this._executeSqlBridge = function(tx, sql, params, dataHandler, errorHandler) {
        var self = this;

        //Standard WebSQL
        tx.executeSql(sql, params, dataHandler, errorHandler);

    };

    this._defaultCallBack = function(transaction, results) {
        //DBSYNC.log('SQL Query executed');
    };

    this._errorHandler = function(transaction, error) {

        console.log('Error : ' + error.message + ' (Code ' + error.code + ') Transaction.sql = ' + transaction.sql);
    };

    this._buildInsertSQL = function(tableName, objToInsert) {
        var members = this._getAttributesList(objToInsert);
        if (members.length === 0) {
            throw 'buildInsertSQL : Error, try to insert an empty object in the table ' + tableName;
        }
        //build INSERT INTO myTable (attName1, attName2) VALUES (?, ?) -> need to pass the values in parameters
        var sql = 'INSERT INTO ' + tableName + ' (';
        sql += this._arrayToString(members, ',');
        sql += ') VALUES (';
        sql += this._getNbValString(members.length, '?', ',');
        sql += ')';
        return sql;
    };

    this._buildUpdateSQL = function(tableName, objToUpdate) {
        /*ex UPDATE "nom de table" SET colonne 1 = [valeur 1], colonne 2 = [valeur 2] WHERE {condition}*/
        var self = this;
        var sql = 'UPDATE ' + tableName + ' SET ';
        var members = self._getAttributesList(objToUpdate);
        if (members.length === 0) {
            throw 'buildUpdateSQL : Error, try to insert an empty object in the table ' + tableName;
        }
        var values = self._getMembersValue(objToUpdate, members);

        var nb = members.length;
        for (var i = 0; i < nb; i++) {
            if(values[i]!==null) {
                sql += '"' + members[i] + '" = "' + values[i] + '"';
                if (i < nb - 1) {
                    sql += ', ';
                }
            }
            
            
        }

        return sql;
    };
    this._getMembersValue = function(obj, members) {
        var memberArray = [];
        for (var i = 0; i < members.length; i++) {
            memberArray.push(obj[members[i]]);
        }
        return memberArray;
    };
    this._getAttributesList = function(obj, check) {
        var memberArray = [];
        for (var elm in obj) {
            if (check && typeof this[elm] === 'function' && !obj.hasOwnProperty(elm)) {
                continue;
            }
            memberArray.push(elm);
        }
        return memberArray;
    };
    this._getNbValString = function(nb, val, separator) {
        var result = '';
        for (var i = 0; i < nb; i++) {
            result += val;
            if (i < nb - 1) {
                result += separator;
            }
        }
        return result;
    };
    this._getMembersValueString = function(obj, members, separator) {
        var result = '';
        for (var i = 0; i < members.length; i++) {
            result += '"' + obj[members[i]] + '"';
            if (i < members.length - 1) {
                result += separator;
            }
        }
        return result;
    };
    this._arrayToString = function(array, separator) {
        var result = '';
        for (var i = 0; i < array.length; i++) {
            result += array[i];
            if (i < array.length - 1) {
                result += separator;
            }
        }
        return result;
    };
});