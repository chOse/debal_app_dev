App
.factory('SQLiteService', function(GENERAL_CONFIG, DB_CONFIG, LocalStorageService) {

    var
    APP_NAME = (GENERAL_CONFIG.APP_NAME + "_"),
    _db,

    getDb = function() {
        return _db;
    }
    
    _executeSQL = function(sql, data, callback) {

        if(arguments.length === 2 && typeof(data) === "function") { // No Data specified
            var callback = data;
            _db.transaction(
                function(tx) {
                    _queryDB(tx, sql, [], callback);
                },
                function(err, err2){
                    _errorCB(err, sql, callback, err2);
                }
            );
        }

        else {
            _db.transaction(function(tx){
                _queryDB(tx, sql, data, callback);
            }, function(err, err2){
                _errorCB(err, sql, callback, err2);
            });
        }
    },

    _querySuccess = function(tx, results, callback) {
        
        try {
            results.insertId;
            return callback(results);
        }
        catch(e) {
            var len = results.rows.length, db_result = [];
            if(results.rows.length > 0)
                for(var i = 0; i < len; i++)
                    db_result[i] = results.rows.item(i);
            return (callback ? callback(db_result) : true);
        }
    },

    _queryDB = function(tx, sql, data, callback) {

        tx.executeSql(sql, data,
            function(tx, results) { // Success CB
                return _querySuccess(tx, results, callback);
            },
            function(tx, errObject) { // Error CB
                return _errorCB(errObject, sql, data);
            });
    },

    _errorCB = function(errObject, sql, data, callback) {
        console.error(errObject.message + " >> " + sql + " " + JSON.stringify(data));
        return true;
    },
            
    init_db = function(db, appName, db_name, db_tables, db_tables_sql, clear, callback) {

        if(appName && db_name && db_tables && db_tables_sql) {
            _db = db;

            if(LocalStorageService.get("db_inited") !== "true" || clear) {
                console.error("Recreating DB");

                _executeSQL('DELETE FROM new_elem', function() {
                    _executeSQL('DELETE FROM sync_info', function() {
                        _executeSQL('DELETE FROM sqlite_sequence', function() {
                            if(callback) callback();
                        });
                    });
                });
                
                
                db_tables.forEach(function(v){
                    _executeSQL('DROP TABLE IF EXISTS '+v);
                });

                db_tables_sql.forEach(function(v){
                    _executeSQL(v, function(){
                        LocalStorageService.set("db_inited", "true"); 
                    });
                });
            }

            else {
                if(callback) callback();
            }
        }
    },

    /* query methods */
    
        SQLite = function() { // works with local SQLite DB 
            // DB is normally triggered via API
            // but we often need to make several DB opeartion and then sync all the stuff at one time
            // in this case we use manually API._sync after all
        
        var _sql = "",

        select = function(data) {
          var select = (data ? data : "*");
          return _sql = 'SELECT ' + select + ' ';
        },
        from = function(table) {
          _sql += ' FROM ' + table;
        },
        where = function(where) {
          _sql += (_sql.match(/( WHERE )/g) ? " AND " : " WHERE ");
          return _sql += where;
        },
        where_in = function(field, values) {
          _sql += (_sql.match(/( WHERE )/g) ? " AND " : " WHERE ");
          var where = field+" IN (";
          values.forEach(function(v,k){
              where += ( k === 0 ? v : (", "+v) );
          });
          return _sql += (where+")");
        },
        join = function(table, on) {
          return _sql += ' INNER JOIN ' + table + ' ON ' + on;
        },
        left_join = function(table, on) {
          return _sql += ' LEFT JOIN ' + table + ' ON ' + on;
        },
        order_by = function(order) {
          return _sql += ' ORDER BY ' + order;
        },
        order_by_desc = function(order) {
          return _sql += ' ORDER BY ' + order + ' DESC';
        },
        group_by = function(group) {
          return _sql += ' GROUP BY ' + group;
        },
        having = function(having) {
          return _sql += ' HAVING ' + having;
        },
        limit = function(limit, offset) {
          return _sql += ' LIMIT ' + limit + (offset ? (" OFFSET " + offset) : "");
        },
        query = function(callback) {
          _executeSQL(_sql, callback);
        },
        row = function(callback) {
          // return one row
          _executeSQL(_sql + ' LIMIT 1', function(data) {
              callback(data[0]);
          });
        },
        col = function(callback) {
          // return one col
          _executeSQL(_sql + ' LIMIT 1', function(data) {
              if(data.length > 0 ){
                  for (var i in data[0]) {
                      callback(data[0][i]);
                      break;
                  }
              }else callback([]);
          });
        },

        build_insert_query = function(table, data, callback, attribute) {
            if(typeof attribute == 'undefined')
                var attribute = '';

            var sql = 'INSERT ' + attribute + ' INTO ' + table + ' (', i = 0, values = [];
            for (var key in data) {
                sql += (i == 0 ? key : "," + key);
                ++i;
            }
            i = 0;
            sql += ') VALUES (';
            
            for (var key in data) {
                sql += (i == 0 ? "?" : ",?");
                values.push(data[key]);
                ++i;
            }
            sql += ')';
            return callback(sql, values);
        }

        build_update_query = function(table, data, where, callback) {

            var sql = 'UPDATE ' + table + ' SET ', i = 0, values = [];
            
            for (var key in data) {
                sql += (i == 0 ? key + "=?" : "," + key + "=?");
                ++i;
            }

            i = 0;

            for (var key in data) {
                values.push(data[key]);
                ++i;
            }

            if (where != "" && where != false) {
                if(typeof(where) === "string")
                    sql += " WHERE " + where;
                
                else{//object
                    var _where = "";
                    for(var wi in where)
                        _where += ( _where === "" ? (wi+'= "'+where[wi]+'"') : (' AND ' + wi+'="'+where[wi]+'"') );
                    
                    sql += " WHERE "+_where;
                }
            }

            return callback(sql, values);
        }

        insert = function(table, data, tx, callback, optionalAttribute) {

            build_insert_query(table, data, function(sql,values) {

                if(tx !== null) {
                    return _queryDB(tx, sql, values, callback);
                }
                
                else {
                    return _db.transaction(
                        function(tx) {
                            _queryDB(tx, sql, data, callback);
                        },
                        function(err, err2){
                            _errorCB(err, sql, callback, err2);
                        }
                    );
                }
            }, optionalAttribute)
        },

        update = function(table, data, tx, where, callback) {

            build_update_query(table,data,where, function(sql,values) {
                if(tx !== null) {
                    return _queryDB(tx, sql, values, callback);
                }
                else {
                    return _db.transaction(
                        function(tx) {
                            _queryDB(tx, sql, values, callback);
                        },
                        function(err, err2){
                            _errorCB(err, sql, callback, err2);
                        }
                    );
                }
            });
        },

        txErrorCB = function() {
            console.error("tx error");
            return true;
        },

        remove = function(table, where, callback) {
            var sql = 'DELETE FROM ' + table;
              
            if( (arguments.length === 3 || (arguments.length === 2 && typeof(where) !== "function")) && typeof(where) !== "undefined" )
                sql+= ' WHERE ' + where;
            
            else if(arguments.length === 2 && typeof(where) === "function")
                callback = where;
              
            return (
                callback ? _executeSQL(sql, callback) : _executeSQL(sql)
            );
        };
            

        return {
            getDb           : getDb,
            txErrorCB       : txErrorCB,
            _executeSQL     : _executeSQL,
            select          : select,
            from            : from,
            where           : where,
            where_in        : where_in,
            order_by        : order_by,
            group_by        : group_by,
            order_by_desc   : order_by_desc,
            limit           : limit,
            having          : having,
            join            : join,
            init_db         : init_db,
            left_join       : left_join,
            query           : query,
            row             : row,
            col             : col,
            insert          : insert,
            update          : update,
            remove          : remove,
        };
    };

    return SQLite;
});