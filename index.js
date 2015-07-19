/**
 * Created by maya on 2015/7/18.
 */
import Moment from 'moment';

//This file comes from: http://stackoverflow.com/questions/1638337/the-best-way-to-synchronize-client-side-javascript-clock-with-server-date#answer-22969338

// the NTP algorithm
// t0 is the client's timestamp of the request packet transmission,
// t1 is the server's timestamp of the request packet reception,
// t2 is the server's timestamp of the response packet transmission and
// t3 is the client's timestamp of the response packet reception.
function ntp(t0, t1, t2, t3) {
    return {
        roundtripdelay: (t3 - t0) - (t2 - t1),
        offset: ((t1 - t0) + (t2 - t3)) / 2
    };
}

function getNTPOffset(MqttClient, topic){
    return new Promise(function(resolve, reject){
        // calculate the difference in seconds between the client and server clocks, use
        // the NTP algorithm, see: http://en.wikipedia.org/wiki/Network_Time_Protocol#Clock_synchronization_algorithm
        var t0 = Date.now();
        MqttClient.publish("timesync", {timesync: "Request"});
        MqttClient.onMessage(topic, "timesync", function (msg) {
            if (msg.timesync === "Response") {
                // NOTE: t2 isn't entirely accurate because we're assuming that the server spends 0ms on processing.
                // (t1 isn't accurate either, as there's bound to have been some processing before that, but we can't avoid that)
                var t1 = msg.serverTime,
                    t2 = msg.serverTime,
                    t3 = Date.now();

                // we can get a more accurate version of t2 if the server's response
                // contains a Date header, which it generally will.
                // EDIT: as @Ariel rightly notes, the HTTP Date header only has
                // second resolution, thus using it will actually make the calculated
                // result worse. For higher accuracy, one would thus have to
                // return an extra header with a higher-resolution time. This
                // could be done with nginx for example:
                // http://nginx.org/en/docs/http/ngx_http_core_module.html
                // var date = resp.getResponseHeader("Date");
                // if (date) {
                //     t2 = (new Date(date)).valueOf();
                // }
                var c = ntp(t0, t1, t2, t3);

                // log the calculated value rtt and time driff so we can manually verify if they make sense
                console.log("NTP delay:", c.roundtripdelay, "NTP offset:", c.offset, "corrected:", Moment(t3 + c.offset).format("YYYY-MM-DD HH:mm:ss SSS"));
                resolve(c.offset);
            }
        });
    });
}

export default getNTPOffset;