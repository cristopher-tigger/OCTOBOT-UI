/**
 * OCTOBOT - Background Animation v0.5
 * Neural Network / Particle Circuit System
 * Color Theme: #03494b (with tech glow)
 */

class BackgroundAnimation {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.numParticles = 80;
        this.maxDistance = 180;
        this.speedScale = 0.3;
        this.baseColor = '3, 73, 75'; // #03494b
        
        this.init();
        window.addEventListener('resize', () => this.resize());
        this.animate();
    }

    init() {
        this.resize();
        this.createParticles();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        this.numParticles = Math.floor((this.width * this.height) / 18000);
        if (this.numParticles > 150) this.numParticles = 150;
        if (this.numParticles < 40) this.numParticles = 40;
        
        this.createParticles();
    }

    createParticles() {
        this.particles = [];
        for (let i = 0; i < this.numParticles; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * this.speedScale,
                vy: (Math.random() - 0.5) * this.speedScale,
                radius: Math.random() * 2 + 0.5,
                pulse: Math.random() * Math.PI,
                pulseSpeed: 0.01 + Math.random() * 0.02
            });
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Rainbow cycle based on time
        const time = Date.now() * 0.001;
        const hue = (time * 30) % 360;

        for (let i = 0; i < this.particles.length; i++) {
            let p = this.particles[i];
            
            p.x += p.vx;
            p.y += p.vy;
            
            if (p.x < 0) p.x = this.width;
            if (p.x > this.width) p.x = 0;
            if (p.y < 0) p.y = this.height;
            if (p.y > this.height) p.y = 0;
            
            // Draw connections
            for (let j = i + 1; j < this.particles.length; j++) {
                let p2 = this.particles[j];
                let dx = p.x - p2.x;
                let dy = p.y - p2.y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < this.maxDistance) {
                    let opacity = (1 - dist / this.maxDistance) * 0.6;
                    // Rainbow effect: HSL(hue, saturation, lightness)
                    this.ctx.strokeStyle = `hsla(${hue}, 70%, 50%, ${opacity})`;
                    this.ctx.lineWidth = 1.1;
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(p.x, p.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.stroke();
                }
            }
            
            // Draw particle
            p.pulse += p.pulseSpeed;
            let pulseOpacity = 0.4 + (Math.sin(p.pulse) + 1) * 0.3;
            this.ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${pulseOpacity})`;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Subtle glow
            if (p.radius > 1.8) {
                this.ctx.shadowBlur = 12;
                this.ctx.shadowColor = `hsla(${hue}, 70%, 50%, 0.8)`;
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            }
        }
    }

    animate() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.draw();
            return;
        }
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new BackgroundAnimation('bg-canvas');
});
