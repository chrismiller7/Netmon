var dns = require("dns");

function Task(options)
{
	options.require("host");
}

Task.prototype.Run = function(task, options)
{
	return new Promise((g,f)=>{
		this.start = new Date();
		dns.resolve4(options.host, (err,addresses)=> {
			if (err) f(err);
			else g(addresses);
		});
	})
	.then((addresses)=>{
		this.elapsed = new Date()-this.start;
		var obj = {ms: this.elapsed};

		if (addresses.length == 0)
			task.fail("did not resolve: " + options.host, obj);
		else {
			task.success("Resolved " + options.host + " to " + addresses[0], obj);	
		}
	})
	.catch((err)=>{
		task.log(err);
		task.fail("did not resolve: " + options.host, {});
	});	
}

module.exports = Task;


