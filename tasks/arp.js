var pcap = require('pcap');
var linq = require('linq');
var arp = require("arpjs");
var os = require("os");

/*var sess = null;

setInterval(()=>{

	if (sess) sess.close();
	sess  = pcap.createSession("eth0", "arp");
	sess.on('packet', (raw)=>{
		task.log("Rx ARP"); 
	});
	global.gc();
	console.log(process.memoryUsage().heapUsed);
}, 5000);
*/

function Task(options) 
{
	options.require("interface");
	options.require("targetIp");
	options.require("timeout");
	arp.setInterface(options.interface); // Memory leak if you call this more than once!
}

Task.prototype.Run = function(task, options) 
{
    return new Promise((succ,fail)=>{
	//console.log("Test");
	var network = os.networkInterfaces()[options.interface];
	if (network) network = network[0];
	//console.log("test2");
	if (!network){
		task.fail("interface not found: " + options.interface, {});
		fail();
		return;
	}

	this.sess = pcap.createSession(options.interface, "arp");
	this.sess.on('packet', (raw)=>{
		//task.log("Rx ARP"); 
		var dec = pcap.decode.packet(raw);
		var arp = dec.payload.payload;
		//task.log(arp);
		arp.sender_ha = toMac(arp.sender_ha.addr);
		arp.sender_pa = toIp(arp.sender_pa.addr);
		arp.target_ha = toMac(arp.target_ha.addr);
		arp.target_pa = toIp(arp.target_pa.addr);
		if (arp.sender_pa == network.address && arp.target_pa == options.targetIp) {
			this.startTime = getTime(dec);		
		}
		if (arp.sender_pa == options.targetIp && arp.target_pa == network.address) {
			this.elapsed = getTime(dec) - this.startTime;
			succ(arp);	
		}
	});
	setTimeout(()=>{
		task.log("timed out");
		fail();
	},options.timeout);

	task.log(network);
	task.log("set interface: " + options.interface);
	var arpdata = {
		'op': 'request',
  		'src_ip': network.address,
  		'dst_ip': options.targetIp,
  		'src_mac': network.mac,
  		'dst_mac': 'ff:ff:ff:ff:ff:ff'
  	};
	task.log("sending arp request:");
	task.log(arpdata);
	//this.startTime = new Date();
	arp.send(arpdata);
    })
    .then((arp) => {
	this.Close();
	var obj = {};
	obj.ms = Math.round(this.elapsed*1000, 2);
	task.success(arp.sender_pa + " => " + arp.sender_ha ,obj);	
    })
    .catch(()=>{
	this.Close();
    });
}

Task.prototype.Close = function()
{
	if (this.sess) {
		console.log("Closing session!");
    		this.sess.close();	
	}
	this.sess = null;
	
}

function getTime(pcap)
{
	console.log(pcap);
	return pcap.pcap_header.tv_sec + pcap.pcap_header.tv_usec/1000000;
}

function toIp(arr)
{
	return arr.join('.');
}

function toMac(arr)
{
	return linq.from(arr).select(s=>s.toString(16)).toArray().join(':');	
}


module.exports = Task;
