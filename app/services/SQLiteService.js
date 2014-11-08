App
.factory('SQLiteService', function(GENERAL_CONFIG, DB_CONFIG, LocalStorageService) {

    var
    
    APP_NAME = (GENERAL_CONFIG.APP_NAME + "_"),
    _db,
    
    _executeSQL = function(sql, data, callback) {
        console.log(sql);

        if(arguments.length === 2 && typeof(data) === "function") { // No Callback specified
            var callback = data;
            _db.transaction(function(tx) {
                _queryDB(tx, sql, [], callback);
            }, function(err, err2){
                _errorCB(err, sql, callback, err2);
            });
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
        console.log("_querySuccess");
        
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
        tx.executeSql(sql, data, function(tx, results){
            _querySuccess(tx, results, callback);
        }, function(err, err2){
            _errorCB(err, err2, sql, data, callback);
        });
    },

    _errorCB = function(err, err2, sql, data, callback) {
        console.log("Error processing SQL, error & sql below:");

        console.log(sql);
        console.log(data);
        console.log(err2);
        if(is_set(callback))callback({error:err});
    },
            
    init_db = function(db, appName, db_name, db_tables, db_tables_sql, clear, callback) {

        if(appName && db_name && db_tables && db_tables_sql) {
            _db = db;

            if(LocalStorageService.get("db_inited") !== "true" || clear) {
                console.log("recreated");

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
    
    
    SQLite = function(){ // works with local SQLite DB 
        // DB is normally triggered via API
        // but we often need to make several DB opeartion and then sync all the stuff at one time
        // in this case we use manually API._sync after all
    
    var

        _sql = "",

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
      insert_or_ignore = function(table, data, callback) {
          var sql = 'INSERT OR IGNORE INTO ' + table + ' (', i = 0;
          for (var key in data) {
              sql += (i == 0 ? key : "," + key);
              ++i;
          }
          i = 0;
          sql += ') VALUES (';
          for (var key in data) {
            sql += (i == 0 ? "'" + data[key] + "'" : ",'" + data[key] + "'");
//              sql += (i == 0 ? '"' + data[key] + '"' : ',"' + data[key] + '"');
              ++i;
          }
          sql += ')';
          return (callback ? _executeSQL(sql, function(res) {
              callback(res.insertId);
          }) : _executeSQL(sql));
      },
      insert = function(table, data, callback) {
          var sql = 'INSERT OR IGNORE INTO ' + table + ' (', i = 0, values = [];
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
          return (callback ? _executeSQL(sql, values, function(res) {
              callback(res.insertId);
          }) : _executeSQL(sql, values));
      },
      insert_or_replace = function(table, data, callback) {
        console.log("database IOR");
        console.log(data);
          var sql = 'INSERT OR REPLACE INTO ' + table + ' (', i = 0, values = [];
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
          return (callback ? _executeSQL(sql, values, callback) : _executeSQL(sql, values)); // callback = function(res) where insertid = res.insertId;
      },
      batch_insert = function(table, data, callback) {
          if (typeof table != "string")
              return false; // table is a string not an array
          if (data instanceof Array === false)
              return false; // data is array here
          var i = 0, _this = this, sql = 'INSERT INTO ' + table + ' (id';
          for (var key in data[0]) {
              sql += "," + key;
          }
          sql += ')';
          for (var j in data) {
              for (var ij in data[j]) {
                  if (i == 0) {
                      j == 0 ? sql += " SELECT '" + _this._make_id(table) + "' as id" : sql += " UNION SELECT '" + _this._make_id(table) + "' as id";
                  }
                  if (j == 0) {
                      sql += ", '" + data[j][ij] + "' as " + ij + ""
                  } else {
                      sql += ", '" + data[j][ij] + "'";
                  }
                  ++i;
              }
              i = 0;
          }
          return (
                  callback ? _executeSQL(sql, function() {
              callback();
          }) : _executeSQL(sql)
                  );
      },
      batch_insert_or_ignore = function(table, data, callback) {
          if (typeof table != "string")
              return false; // table is a string not an array
          if (data instanceof Array === false)
              return false; // data is array here
          var i = 0, _this = this, sql = 'INSERT OR IGNORE INTO ' + table + ' (', ij = 0;
          for (var key in data[0]) {
              if (ij != 0) {
                  sql += ",";
              }
              sql += key;
              ++ij;
          }
          var ijk = 0;
          sql += ')';
          for (var j in data) {
              for (var ij in data[j]) {
                  if (i == 0) {
                      j == 0 ? sql += ' SELECT ' : sql += ' UNION SELECT ';
                  }
                  if (j == 0) {
                      if (ijk != 0) {
                          sql += ",";
                      }
                      sql += (data[j][ij] === null ? (data[j][ij] + ' as ' + ij) : ('"' + data[j][ij] + '" as ' + ij + '') );
                  } else {
                      if (ijk != 0) {
                          sql += ",";
                      }
                      sql += (data[j][ij] === null ? data[j][ij] : ('"' + data[j][ij] + '"'));
                  }
                  ++i;
                  ++ijk;
              }
              i = 0;
              ijk = 0;
          }
          return (
                  callback ? _executeSQL(sql, function() {
              callback();
          }) : _executeSQL(sql)
                  );
      },
      batch_insert_with_id = function(table, data, callback) {
          if (typeof table != "string")
              return false; // table is a string not an array
          if (data instanceof Array === false)
              return false; // data is array here
          var i = 0, _this = this, sql = 'INSERT INTO ' + table + ' (', ij = 0;
          for (var key in data[0]) {
              if (ij != 0) {
                  sql += ",";
              }
              sql += key;
              ++ij;
          }
          var ijk = 0;
          sql += ')';
          for (var j in data) {
              for (var ij in data[j]) {
                  if (i == 0) {
                      j == 0 ? sql += ' SELECT ' : sql += ' UNION SELECT ';
                  }
                  if (j == 0) {
                      if (ijk != 0) {
                          sql += ",";
                      }
                      sql += '"' + data[j][ij] + '" as ' + ij + ''
                  } else {
                      if (ijk != 0) {
                          sql += ",";
                      }
                      sql += '"' + data[j][ij] + '"';
                  }
                  ++i;
                  ++ijk;
              }
              i = 0;
              ijk = 0;
          }
          return ( callback ? _executeSQL(sql, callback) : _executeSQL(sql) );
      },
      batch_insert_or_ignore_with_id = function(table, data, callback) {
          if (typeof table != "string")
              return false; // table is a string not an array
          if (data instanceof Array === false)
              return false; // data is array here
          var i = 0, _this = this, sql = 'INSERT OR IGNORE INTO ' + table + ' (', ij = 0;
          for (var key in data[0]) {
              if (ij != 0) {
                  sql += ",";
              }
              sql += key;
              ++ij;
          }
          var ijk = 0;
          sql += ')';
          for (var j in data) {
              for (var ij in data[j]) {
                  if (i == 0) {
                      j == 0 ? sql += ' SELECT ' : sql += ' UNION SELECT ';
                  }
                  if (j == 0) {
                      if (ijk != 0) {
                          sql += ",";
                      }
                      sql += '"' + data[j][ij] + '" as ' + ij + ''
                  } else {
                      if (ijk != 0) {
                          sql += ",";
                      }
                      sql += '"' + data[j][ij] + '"';
                  }
                  ++i;
                  ++ijk;
              }
              i = 0;
              ijk = 0;
          }
          return ( callback ? _executeSQL(sql, callback) : _executeSQL(sql) );
      },
      update = function(table, data, where, callback) {
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

          return (callback ? _executeSQL(sql, values, callback) : _executeSQL(sql, values));
      },
      remove = function(table, where, callback) {
            var sql = 'DELETE FROM ' + table;
          
            if( (arguments.length === 3 || (arguments.length === 2 && typeof(where) !== "function")) && typeof(where) !== "undefined" )
                sql+= ' WHERE ' + where;
            else if(arguments.length === 2 && typeof(where) === "function"){
                callback = where;
            }
          
          return (
                  callback ? _executeSQL(sql, function() {
              callback();
          }) : _executeSQL(sql)
                  );
      },
      batch_remove = function(table, data, callback) {
          var sql = 'DELETE FROM ' + table + ' WHERE id IN (';
          data.forEach(function(row, i) {
              sql += (i == 0 ? '"' + row.id + '"' : ',"' + row.id + '"');
          });
          sql += ")";
          return (
                  callback ? _executeSQL(sql, function() {
              callback();
          }) : _executeSQL(sql)
                  );
      },
      replace = function(table, data, callback) {
          var i = 0, j = 0, sql = "", all_sql = "REPLACE INTO " + table + " ( ";
          for (var str in data) {
              if (i != 0) {
                  all_sql += ",";
              }
              all_sql += str;
              ++i;
          }
          all_sql += ") VALUES (";

          for (var i in data) {
              if (j != 0) {
                  sql += ',';
              }
              sql += '"' + data[i] + '"';
              ++j;
          }
          all_sql += sql + ')';

          return (
                  callback ? _executeSQL(sql, function() {
              callback();
          }) : _executeSQL(sql)
                  );
      },
      batch_replace = function(table, data, callback) {
          var i = 0, sql = "REPLACE INTO " + table + " ( ";
          for (var key in data[0]) {
              if (i != 0) {
                  sql += ",";
              }
              sql += key;
              ++i;
          }
          sql += ") ", i = 0;
          for (var j in data) {
              for (var ij in data[j]) {
                  if (i == 0) {
                      j == 0 ? sql += ' SELECT ' : sql += ' UNION SELECT ';
                  } else {
                      sql += ",";
                  }
                  if (j == 0) {
                      sql += ' "' + data[j][ij] + '" as ' + ij + ''
                  } else {
                      sql += ' "' + data[j][ij] + '"';
                  }
                  ++i;
              }
              i = 0;
          }
          return (
                  callback ? _executeSQL(sql, function() {
              callback();
          }) : _executeSQL(sql)
                  );
      },
      insert_batch_on_duplicate_update = function(table, data, callback) {
          var _this = this, len = data.length;
          batch_insert_or_ignore(table, data, function(){
                if(is_array(data))
                    data.forEach(function(row, i) {
                        if (i == len - 1) {
                            update(table, row, 'id = "' + row.id + '"', callback);
                        } else {
                            update(table, row, 'id = "' + row.id + '"');
                        }
                    });
                else
                    update(table, data, 'id = "' + data.id + '"', callback);
          });
      },
      insert_on_duplicate_update = function(table, key, data, callback) {

          insert_or_ignore(table, data, function(){
              update(table, data, key + ' = "' + data[key] + '"', callback);
          });
      };
        

        return {
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
            insert_or_replace          : insert_or_replace,
            update          : update,
            remove          : remove,
            insert_batch_on_duplicate_update          : insert_batch_on_duplicate_update,
            insert_on_duplicate_update                : insert_on_duplicate_update,
            recreate_db : function() {
                console.log("start recreate_db");
                __init_db(  GENERAL_CONFIG.APP_NAME,
                            DB_CONFIG.DB_NAME,
                            DB_CONFIG.TABLES,
                            DB_CONFIG.CREATE_SQL,
                            true  );
            }
        };
          
    };
    return SQLite;
});