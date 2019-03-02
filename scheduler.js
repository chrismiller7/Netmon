var Enumerable = require("linq");

function Scheduler()
{
	this.queue = [];
	this.isRunningTask = false;
}

Scheduler.prototype.addTask = function(taskName, runFunc)
{
	var hasTask = Enumerable.from(this.queue).any(i=>i.taskName==taskName);
	if (!hasTask) {
		this.queue.push({taskName:taskName, runFunc:runFunc});
		this.startNext();
	}
}

Scheduler.prototype.startNext = function()
{
	if (!this.isRunningTask && this.queue.length > 0)
	{
		this.isRunningTask = true;
		var item = this.queue.shift();
		console.log("Starting task: " + item.taskName);
		item.runFunc()
		.then(()=>{
			console.log("Ending task: " + item.taskName); 
			this.isRunningTask = false; 
			this.startNext();
		});
	}
}


module.exports = Scheduler
