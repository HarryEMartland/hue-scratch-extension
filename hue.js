(function (ext) {

    var loginRetryAmount = 6;
    var loginRetryTimeout = 5000;
    var lightMap = {};
    var onOffMap = {"On": true, "Off": false};
    var ip = localStorage.getItem("hueIp");
    var username = localStorage.getItem("hueUsername");

    ext._shutdown = function () {
    };

    ext._getStatus = function () {
        if (ip === null && username === null) {
            return {status: 1, msg: 'Configuration required, refresh page and press button on hub'};
        }
        if ($.isEmptyObject(lightMap)) {
            return {status: 1, msg: 'No lights found'};
        }
        return {status: 2, msg: 'Ready'};
    };

    ext.set_config = function (newIp, newUsername, callback) {
        ip = newIp.trim();
        localStorage.setItem("hueIp", ip);
        username = newUsername.trim();
        localStorage.setItem("hueUsername", username);
        callback();
    };

    ext.set_light_status = function (light, status, callback) {
        $.ajax({
            url: 'http://' + ip + '/api/' + username + '/lights/' + lightMap[light] + '/state',
            type: 'PUT',
            data: '{"on":' + onOffMap[status] + '}'
        }).always(callback);
    };

    ext.set_light_brightness = function (light, brightness, callback) {
        $.ajax({
            url: 'http://' + ip + '/api/' + username + '/lights/' + lightMap[light] + '/state',
            type: 'PUT',
            data: '{"bri":' + brightness + '}'
        }).always(callback);
    };

    ext.get_light_status = function (light, callback) {
        $.get('http://' + ip + '/api/' + username + '/lights/' + lightMap[light], function (data) {
            callback(data.on)
        })
    };

    ext.get_light_brightness = function (light, callback) {
        $.get('http://' + ip + '/api/' + username + '/lights/' + lightMap[light], function (data) {
            callback(data.bri)
        })
    };

    var lightMenuItems = [];
    var descriptor = {
        blocks: [
            // Block type, block name, function name
            ['w', 'set ip %s and password %s', 'set_config'],

            ['w', 'set light %m.light status to %m.status', 'set_light_status'],
            ['w', 'set light %m.light brightness to %n', 'set_light_brightness'],

            ['R', 'get Light %m.light Status', 'get_light_status'],
            ['R', 'get Light %m.light Brightness', 'get_light_brightness']
        ],
        menus: {
            status: ['On', 'Off'],
            light: lightMenuItems
        }
    };

    function register() {
        ScratchExtensions.register('Hue', descriptor, ext);
    }

    function checkIp(ipToCheck, retries) {
        return $.ajax({
            method: 'POST',
            url: 'http://' + ipToCheck + '/api',
            dataType: "json",
            data: '{"devicetype": "scratch#scratchUser"}',
            timeout: 500
        }).then(function (data) {
            if (data[0] && data[0].success && data[0].success.username) {
                ext.set_config(ipToCheck, data[0].success.username, function () {
                });
                return loadLights()
            } else if (data[0].error && data[0].error.type === 101 && retries > 0) {
                return timer(loginRetryTimeout).then(function () {
                    return checkIp(ipToCheck, retries - 1);
                });
            }
        }, $.Deferred().resolve().promise)
    }

    function timer(timeout) {
        var deferred = $.Deferred();
        setTimeout(deferred.resolve, timeout);
        return deferred.promise();
    }

    function loadLights() {
        return $.get('http://' + ip + '/api/' + username + '/lights')
            .then(function (lights) {
                $.each(lights, function (key, value) {
                    lightMenuItems.push(value.name);
                    lightMap[value.name] = key;
                });
            });
    }

    function getLocalIp() {
        var deferred = $.Deferred();
        window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;   //compatibility for firefox and chrome
        var pc = new RTCPeerConnection({iceServers: []}), noop = function () {
        };
        pc.createDataChannel("");    //create a bogus data channel
        pc.createOffer(pc.setLocalDescription.bind(pc), noop);    // create offer and set local description
        pc.onicecandidate = function (ice) {  //listen for candidate events
            if (!ice || !ice.candidate || !ice.candidate.candidate)  return;
            var localIp = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/.exec(ice.candidate.candidate)[1];
            pc.onicecandidate = noop;
            deferred.resolve(localIp);
        };
        return deferred.promise();
    }

    if (ip && username) {
        loadLights().then(register);
    } else {
        getLocalIp().then(function (localIp) {
            var baseIp = localIp.replace(/\d*$/, '');

            return $.when.apply($, _.map(_.range(1, 255), function (_, i) {
                return checkIp(baseIp + i, loginRetryAmount);
            }))
        }).then(register)
    }

})({});