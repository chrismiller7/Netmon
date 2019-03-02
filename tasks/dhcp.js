var dhcp = require("dhcp");

var L = dhcp.createBroadcastHandler();

L.on('message', function (data) {
console.log(data);
  if (data.options[53] === dhcp.DHCPDISCOVER) {
    if (data.chaddr === '12-34-56-78-90-AB') {
      console.log('Welcome home!');
    }
  }
});

L.listen();


var s = dhcp.createClient({mac:"11:11:11:11:11:11"});

s.on('message', function (data) {
  console.log(data);
});

s.on('error', function (err, data) {
  console.log(err, data);
});

s.on('listening', function (sock) {
  var address = sock.address();
  console.info('Client Listening: ' + address.address + ':' + address.port);
});

s.on('bound', function (state) {

  console.log("State: ", state);

  // `ip address add IP/MASK dev eth0`
  // `echo HOSTNAME > /etc/hostname && hostname HOSTNAME`
  // `ip route add default via 192.168.1.254`
  // `sysctl -w net.inet.ip.forwarding=1`
  s.close();
});

s.listen(666);

s.sendDiscover();

