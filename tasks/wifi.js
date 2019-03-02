var wifi = require("wireless-tools/iwconfig");
var ifconfig = require("wireless-tools/ifconfig");
var exec = require("child_process").exec;
var execSync = require("child_process").execSync;

//Run(0, {connectionTimeout:8000, ssid:"Waffle2", minQuality:65, minSignal:-50});

function Task(options) 
{
	options.require("ssid");
	options.require("minQuality");
	options.require("minSignal");

}

Task.prototype.Run = function(task, options)
{
	return RunCmd("ls")
	.then(()=>{return RunCmd("ifdown wlan0");})
	.then(()=>{return Wait(1000);})
	.then(()=>{return RunCmd("ifup wlan0",false);})
	//.then(()=>{return RunCmd("ifconfig wlan0 0.0.0.0 up");})
	//.then(()=>{return Wait(options.connectionTimeout);})
	//.then(()=>{return Promise.all([GetWifiStatus(task),GetIpStatus(task)]) })
	//.then((stat)=>{return CheckWifiStatus(task, options, stat[0], stat[1]);})
	.then(()=>{return LoopCheck(task, options);});
}

function RunCmd(cmd, wait) {
	if (wait === undefined) wait = true;

	return new Promise((succ, fail)=>{
		console.log("Running: " + cmd);
		exec(cmd,(err, stderr, stdout)=>{
			console.log("" + cmd + " - done!");
			if (wait) succ();
		});
		if (!wait) succ();
	});
}

function Wait(time)
{
	return new Promise((succ,fail)=>{
		setTimeout(succ,time);
	});
}

function GetWifiStatus(task)
{
	return new Promise((suc,fail)=>{
		task.log("get wifi status");
		wifi.status("wlan0", (err,stat)=>{
			task.log("wifi done");
			if (err) fail(err);
			else suc(stat);
		});
	});
}

function GetIpStatus(task)
{
	return new Promise((suc,fail)=>{
		task.log("get ip status");
		ifconfig.status("wlan0", (err,status)=> {
			task.log("ip status done");
			if (err) fail(err);
			else suc(status);
		});
	});
}

function LoopCheck(task, options)
{
	var pro = Promise.all([GetWifiStatus(task),GetIpStatus(task)])
	.then((arr)=>{
		var wifi = arr[0];
		var ip = arr[1];
		if (wifi.access_point && ip.ipv4_address) {
			console.log("wifi connected!");
			CheckWifiStatus(task, options, wifi, ip);
		}
		else {
			console.log("waiting for connection ...");
			return Wait(300).then(()=>{ return LoopCheck(task, options);});	
		}
	});
	return pro;
}

function CheckWifiStatus(task, options, status, ipStat)
{
	//return new Promise((suc,fail) => {	
		var obj = {};
		obj.quality = status.quality || 0;
		obj.signal = status.signal || -99;
		
		if (!status.access_point) {
			task.fail("Failed to connect to AP", obj);
		}
		else if (status.ssid != options.ssid) {
			task.fail("SSID does not match: " + options.ssid, obj);
		}
		else if (status.quality < options.minQuality) {
			task.fail("Quality lower than " + options.minQuality, obj);
		}
		else if (status.signal < options.minSignal) {
			task.fail("Signal lower than " + options.minSignal, obj);
		}
		else if (!ipStat.ipv4_address) {
			task.fail("DHCP failed for wifi", obj);
		}
		else {
			task.success("Wifi connected", obj);
		}
	//	suc();
	//});
}


module.exports = Task;


