engine = function() {}

var G = 0.5;

Math.sign = function(x) {
    return typeof x === 'number' ? x ? x < 0 ? -1 : 1 : x === x ? 0 : NaN : NaN;
}

function bullet(ctx, img, x, y, angle) {
	this.maxV = 200;
	this.img = img;
	this.ctx = ctx;
	this.vx = this.maxV * Math.cos(angle*Math.PI/6);
	this.vy = -this.maxV * Math.sin(angle*Math.PI/6);
	this.X = Math.floor(x);
	this.Y = Math.floor(y);
	this.enable = true;
	console.log("Bullet has run "+this.X+':'+this.Y+' d('+this.vx+':'+this.vy+') a('+angle+')');
	
	this.draw = function() {
		this.ctx.drawImage(this.img, this.X, this.Y);
	}
	this.tick = function(dt) {
		this.X += this.vx * dt;
		this.Y += this.vy * dt;
		
		if (this.X<0 || this.X>640 || this.Y<0 || this.Y>450) {
			this.enable = false; //so, now we're able to forgive this bullet ;-(
		}
	}
}

function biplane(ctx, img_src, bullet_src) {
	this.size = 50; 				// size of plane, we're drawing
	this.origSize = 200;  			// size of plane at image's map
	this.img = new Image(); 		// image's map
	this.img.src = img_src;
	this.bullet_img = new Image(); 	// bullet image
	this.bullet_img.src = bullet_src;
	this.ctx = ctx;		   			// drawing context
	this.X = 20;   					// position X (left border)
	this.Y = 450 - this.size;		// position Y (top border)
	this.angle = 0; 				// determine number of image (at image's map = PI/6)
	this.weight = 7;				// plane's weight
	this.F = 0;						// traction force
	this.airRes = 0;				// air's resistance
	this.vx = 0; 					// speed X / sec
	this.vy = 0; 					// speed Y / sec
	this.V = 0;						// speed
	this.dir = 0;					// speed's direction
	this.bullets = [];				// array of bullets
	this.reloadTime = 1;			// time to reload
	this.reload = 1;				// reload progress [0..reloadTime]
	this.isSky = false; 			// is this plane in the sky?
	this.isAlive = true;			// is this plane alive? ^^
	this.isFlying = true;			// is this plane flying or falling now?
	
	this.incPower = function() {
		this.F += 1;
		if (this.F > 3) this.F = 3;
	}
	
	this.decPower = function() {
		this.F -= 1;
		if (this.F < 0) this.F = 0;
	}
	
	this.rotate = function(dr) { // dr = {-1,1}
		if (!this.isSky && (this.angle + dr < 0 || this.angle + dr > 1)) return;
		this.angle = (this.angle + dr + 12) % 12;
		// if we're not falling, we should change direction of speed
		if (this.isFlying) {
			this.V *= 0.9;
			this.vx = this.V * Math.cos(this.angle*Math.PI/6);
			this.vy = -this.V * Math.sin(this.angle*Math.PI/6);
		}
	}
	
	this.draw = function() {
		var imgY = Math.floor(this.angle/6);
		var imgX = (imgY == 0 ? this.angle%6 : 5-(this.angle%6));		
		for (var i = 0; i < this.bullets.length; i++) {
			this.bullets[i].draw();
		}
		this.ctx.drawImage(this.img,
			imgX*this.origSize, imgY*this.origSize, this.origSize, this.origSize,
			this.X, this.Y, this.size, this.size);
		if (this.X > 640 - this.size) {
			this.ctx.drawImage(this.img,
				imgX*this.origSize, imgY*this.origSize, this.origSize, this.origSize,
				this.X-640, this.Y, this.size, this.size);		
		}
	}
	
	this.shot = function() {
		if (this.reload >= this.reloadTime) {
			this.reload = 0;
			this.bullets.push(new bullet(this.ctx, this.bullet_img, this.X+this.size/2, this.Y+this.size/2, this.angle));
		}
	}
	
	this.step = function(dt) { // dt (sec) < 1 
		var Fx = this.F * Math.cos(this.angle*Math.PI/6) ;
		var Fy = -this.F * Math.sin(this.angle*Math.PI/6) + this.weight * G;
		
		// dV = sqrt( (2F)/(dt*m) )
		this.vx += Math.sqrt( 2*Math.abs(Fx)/(dt*this.weight) ) * Math.sign(Fx);
		this.vy += Math.sqrt( 2*Math.abs(Fy)/(dt*this.weight) ) * Math.sign(Fy);
		
		// calc speed's direction
		this.dir = Math.atan2(-this.vy, this.vx) / Math.PI * 6;
		if (this.dir < 0) this.dir += 12;

		this.V = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
		if (this.V > 100) {
			this.V = 100;
			this.vx = this.V * Math.cos(this.dir*Math.PI / 6);
			this.vy = -this.V * Math.sin(this.dir*Math.PI / 6);
		}
	
		// aerodynamic breaking...
		var t = Math.abs(this.angle - this.dir);
		if ((t<6 ? t : 12-t) >= 2) {
			this.airRes = 0.01*this.V*this.V;
			this.isFlying = false;
		} else if (this.V > 50) { // ...or flying up!
			this.isFlying = true;
		}
		
		if (!this.isFlying) {
			this.V -= this.airRes*dt;
			this.vx = this.V * Math.cos(this.dir*Math.PI / 6);
			this.vy = -this.V * Math.sin(this.dir*Math.PI / 6);		
		}

		this.X += this.vx*dt;
		this.Y += this.vy*dt;
		
		if (this.Y < 400) {
			this.isSky = true;
		}
		if (this.Y < 0) {
			this.Y = 0;
			this.vy = 0;
		}
		if (this.X < 0) {
			this.X = 640;
			//this.vx = 0;
		}
		if (this.X > 640) {
			this.X = 0;
			//this.vx = 0;
		}
		if (this.Y >= 450 - this.size)
			if (this.isSky)	{
				this.isAlive = false;
				console.log("BOOOM!");
			} else {
				if (this.vy > 0) {
					this.vy = 0;
				}
				this.Y = 450 - this.size;
			}
		for (var i = 0; i < this.bullets.length; i++) {
			this.bullets[i].tick(dt);
			if (!this.bullets[i].enable) {
				this.bullets.shift();
			}
		}
		if (this.reload < this.reloadTime) {
			this.reload += dt;
		}
	}
}

engine.prototype = {
    domElement: null,
    ctx: null,
    timer: null,
	user: null,
    biplanes: [],
	bgimage: null,
	bgimage_src: "images/bg.png",
    paused: false,
    audio: {
		fly_down: null,
		fly_up: null,
		fly_high1: null,
		fly_high2: null,
		fly_ready: null,
		fly_stop: null,
		explode: null,
	},

    pause: function()
    {
        this.paused = !this.paused;
        this.redraw();
    },
    keyPress: function(key) {
        switch (key)
        {
            case 38: // up
				this.user.incPower();
                break;
            case 39: // right
				this.user.rotate(-1);
                break;
            case 40: // down
				this.user.decPower();
                break;
            case 37: // left
				this.user.rotate(1);
                break;
            case 16: // LShift
                this.user.shot();
                break;
        }
    },
    init: function(dom_element, scale)
    {
        var that = this;
        this.domElement = dom_element;
        $(this.domElement).click(function(){
            that.pause();
        });
        $(document.body).keydown(function(event){
            that.keyPress(event.which);
            console.log('KeyCode: ' + event.which);
        });
        $(this.domElement).css('cursor','pointer');
        this.ctx = dom_element.getContext('2d');
		this.ctx.font = "normal 14px sans-serif";
		
		this.bgimage = new Image();
		this.bgimage.src = this.bgimage_src;

		this.audio.fly_down = new Audio('sounds/fly_down.ogg');
		this.audio.fly_up = new Audio('sounds/fly_up.ogg');
		this.audio.fly_high1 = new Audio('sounds/fly_high.ogg');
		this.audio.fly_high2 = new Audio('sounds/fly_high.ogg');
		this.audio.fly_ready = new Audio('sounds/fly_ready.ogg');
		this.audio.fly_stop = new Audio('sounds/fly_stop.ogg');
		this.audio.explode = new Audio('sounds/explode.ogg');
		
		$('#start').click(function(){
			that.start();
		});

        this.timer = setInterval( function() { that.ontimer() }, "50" );
    },
	
    redraw: function()
    {
        this.ctx.drawImage(this.bgimage, 0, 0);

		// compute user's biplan's info
		if (this.user != null) {
			this.user.step(0.1);
			if (!this.user.isAlive) {
				this.audio.fly_high1.pause();
				this.audio.fly_high2.pause();
				this.audio.explode.play();
				this.user = null;
				alert("You lose!");
			} else {
				this.user.draw();
			}
		}
		
        for(var i = 0; i < this.biplanes.length; i++) {
			if (!this.biplanes[i].isAlive) {
				this.audio.fly_high1.pause();
				this.audio.explode.play();
				this.biplanes.splice(i,1);
			}
			this.biplanes[i].step(0.1);
			this.biplanes[i].draw();
		}
		
		if (this.user != null) {
			this.ctx.fillText('Speed: '+this.user.V+' ('+this.user.vx+', '+this.user.vy+')', 5, 20);
			this.ctx.fillText('Pos: ('+this.user.X+', '+this.user.Y+')', 5, 40);
			this.ctx.fillText('Angle/Direction: '+this.user.angle+'/'+this.user.dir, 5, 60);
			this.ctx.fillText('Force: '+this.user.F, 5, 80);
			this.ctx.fillText('Sky/Fly/Alive: '+this.user.isSky+'/'+this.user.isFlying+'/'+this.user.isAlive, 5, 100);
		}

        if (this.paused) {
            this.ctx.fillText("Press SpaceBar to play!", 10, this.ctx.height - 20);
        }
    },
	
    ontimer: function()
    {
        if ( this.paused ) {
            return;
        }
        this.redraw();
    },
	
    start: function()
    {
        var that = this;
		this.user = new biplane(this.ctx, "images/bp1.png", "images/bullet.png"); 
        this.paused = false;
        this.redraw();
		setTimeout(
			function() {
				that.audio.fly_high1.loop = true;
//				that.audio.fly_high1.play();
				setTimeout(function(){
					that.audio.fly_high2.loop = true;
//					that.audio.fly_high2.play();
				}, 1200);
			}, 3000);
		this.audio.fly_ready.play();
    },

    stop: function()
    {
        clearTimeout(this.timer);
    },
}