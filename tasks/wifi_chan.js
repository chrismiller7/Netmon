var ping = require("ping");
var exec = require("child_process").exec;
var iwlist = require("wireless-tools/iwlist");
var Enumerable = require("linq");
//Run("",{ssid:"Waffle2"});

function Task(options)
{
	options.require("ssid");
}

Task.prototype.Run = function(task, options)
{
	return new Promise((suc,fail)=>{
	iwlist.scan({ iface : 'wlan0', show_hidden : true }, function(err, networks) {
		//console.log(networks);
		var wifi = Enumerable.from(networks).where(n=>n.ssid==options.ssid).firstOrDefault();
		//console.log(wifi);
		if (!wifi) {
			task.fail("Wifi ssid not available: " + options.ssid, {}); 
		} else {
			var sameChans = Enumerable.from(networks).count(n=>n.channel==wifi.channel && n != wifi);
			//console.log(sameChans);
			var obj = {};
			obj.channel = wifi.channel;
			obj.sameChans = sameChans;
			if (sameChans == 0) {
				task.success("No neighbor AP's on same channel", obj);
			}
			else {
				task.fail("" + sameChans + " AP's detected on channel " + wifi.channel, obj);
			}	
		}
		suc();
	});
	});
}

module.exports = Task;


