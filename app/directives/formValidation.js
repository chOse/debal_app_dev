App.directive('submitOn', function() {
    return {
        link: function(scope, elm, attrs) {
            scope.$on(attrs.submitOn, function() {
                //We can't trigger submit immediately, or we get $digest already in progress error :-[ (because ng-submit does an $apply of its own)
                setTimeout(function() {
                    elm.trigger('submit');
                });
            });
        }
    };
});
App.directive('stringToNumber', function() {
  return {
    require: 'ngModel',
    link: function(scope, element, attrs, ngModel) {
      ngModel.$parsers.push(function(value) {
        return '' + value;
      });
      ngModel.$formatters.push(function(value) {
        return parseFloat(value, 10);
      });
    }
  };
});
App.directive('onValidSubmit', ['$parse', '$timeout', function($parse, $timeout) {
        return {
            require: '^form',
            restrict: 'A',
            link: function(scope, element, attrs, form) {
                form.$submitted = false;
                var fn = $parse(attrs.onValidSubmit);
                element.on('submit', function(event) {
                    scope.$apply(function() {
                        element.addClass('ng-submitted');
                        form.$submitted = true;
                        if (form.$valid) {
                            if (typeof fn === 'function') {
                                fn(scope, {$event: event});
                            }
                        }
                    });
                });
            }
        };

    }])
App.directive('validated', ['$parse', function($parse) {
        return {
            restrict: 'AEC',
            require: '^form',
            link: function(scope, element, attrs, form) {
                var inputs = element.find("*");
                for (var i = 0; i < inputs.length; i++) {
                    (function(input) {
                        var attributes = input.attributes;
                        if (attributes.getNamedItem('ng-model') != void 0 && attributes.getNamedItem('name') != void 0) {
                            var field = form[attributes.name.value];
                            if (field != void 0) {
                                scope.$watch(function() {
                                    return form.$submitted + "_" + field.$valid;
                                }, function() {
                                    if (form.$submitted != true)
                                        return;
                                    var inp = angular.element(input);
                                    if (inp.hasClass('ng-invalid')) {
                                        element.removeClass('has-success');
                                        element.addClass('has-error');
                                    } else {
                                        element.removeClass('has-error').addClass('has-success');
                                    }
                                });
                            }
                        }
                    })(inputs[i]);
                }
            }
        };
    }]);