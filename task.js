var cron = require("node-cron");
var vm = require("vm");
var fs = require("fs");

function Task(db, conf, scheduler, debug)
{
	this.db = db;
	this.conf = conf;
	this.debug = debug;
	this.isRunning = false;
	this.startTime = 0;

	this.conf.options.require = function(param){
		if (!this[param]) throw new Error("Option '"+param+"' required for task:  " + conf.name);
	}.bind(this.conf.options);

	this.conf.options.default = function(param, val){
		if (!this[param]) this[param] = val;
	}.bind(this.conf.options);


	this.collection = this.db.collection(this.conf.collection);
	
	db.createCollection(conf.collection, {strict:false}, function(err, col){
		if (err) throw err;
	});

	var ITask = require("./tasks/" + conf.task);
	this.itask = new ITask(conf.options);

	var thisTask = this;

	cron.schedule(conf.cron, function() {
		scheduler.addTask(conf.name, thisTask.Run.bind(thisTask));
	});
}

Task.prototype.Run = function()
{
	if (this.isRunning) return Promise.resolve();

	console.log("");
	console.log("Running task: " + this.conf.name);
	this.isRunning = true;
	this.startTime = new Date();
	if (this.conf.options.timeout) {
		this.timer = setTimeout(()=>{
			this.fail("Task timed out",{});			
		}, this.conf.options.timeout);
	}
	return this.itask.Run(this, this.conf.options);
}

Task.prototype.Stop = function()
{
	if (this.timer) {
		clearTimeout(this.timer);
		this.timer = null;
	}
	this.isRunning = false;
}

Task.prototype.success = function(msg, data)
{
	console.log("Task SUCCESS: " + msg);
	this.dbInsert(true, msg, data);
}

Task.prototype.fail = function(failMsg, data)
{
	console.log("Task Failed: " + failMsg);
	this.dbInsert(false, failMsg, data);
}

Task.prototype.dbInsert = function(success, msg, data)
{
	if (!this.isRunning)
		return; 

	this.Stop();
	
	var obj = {};
	obj.started = this.startTime;
	obj.elapsed = new Date() - this.startTime;
	obj.success = success;
	obj.message = msg;
	obj.data = data;

	this.log(obj);

	this.collection.insertOne(obj, function(err,res) {
		if (err) throw err;
	});
}

Task.prototype.log = function(msg) 
{
	if (this.debug) console.log(msg);
}


Task.prototype.GetLastEvent = function()
{
	var obj = this.collection.findOne({}, {sort:{$natural:-1}});
	console.log(obj);
	return obj;
}

Task.prototype.GetLastSuccessEvent = function()
{
	return this.collection.findOne({"success":true}, {sort:{$natural:-1}})
}


module.exports = Task
