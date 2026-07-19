export function startAnimation(container, config, elements, api) {
    const { radius, center, circumference, gapOffset, waves, amplitude } = config;
    const { path, track, stopIndicator } = elements;
    
    let phase = 0;
    let currentProgress = 0;
    let indetOffset = 0;
    let indetPulse = 0;
    
    function animate() {
        phase -= 0.08;
        const mode = container.dataset.mode || "determinate";
        
        if (mode === "indeterminate") {
            track.style.display = "block";
            stopIndicator.style.display = "none";
            
            indetOffset += 0.006;
            if (indetOffset >= 1) indetOffset -= 1;
            
            indetPulse += 0.04;
            const progress = 0.5 + Math.sin(indetPulse) * 0.35;
            const visibleLength = 1 - progress - gapOffset * 2;
            
            if (visibleLength <= 0) {
                track.style.strokeDasharray = `0 ${circumference}`;
                track.style.strokeDashoffset = 0;
                track.style.opacity = "0";
            } else {
                track.style.opacity = "1";
                const visibleTrack = visibleLength * circumference;
                const emptyTrack = circumference - visibleTrack;
                const gapTrack = (indetOffset + progress + gapOffset) * circumference;
                track.style.strokeDasharray = `${visibleTrack} ${emptyTrack}`;
                track.style.strokeDashoffset = -gapTrack;
            }
            
            let wavePath = "";
            const maxAngle = progress * Math.PI * 2;
            const offsetAngle = indetOffset * Math.PI * 2;
            const step = 0.05;
            
            for (let a = 0; a <= maxAngle; a += step) {
                const currentAngle = a + offsetAngle;
                const r = radius + Math.sin(currentAngle * waves + phase) * amplitude;
                const x = center + Math.cos(currentAngle) * r;
                const y = center + Math.sin(currentAngle) * r;
                wavePath += (a === 0 ? "M " : "L ") + `${x.toFixed(2)} ${y.toFixed(2)} `;
            }
            
            const endAngle = maxAngle + offsetAngle;
            const rEnd = radius + Math.sin(endAngle * waves + phase) * amplitude;
            const xEnd = center + Math.cos(endAngle) * rEnd;
            const yEnd = center + Math.sin(endAngle) * rEnd;
            wavePath += `L ${xEnd.toFixed(2)} ${yEnd.toFixed(2)}`;
            
            path.setAttribute("d", wavePath);
            currentProgress = progress;
        } else {
            track.style.display = "block";
            stopIndicator.style.display = "block";
            
            // Read target from the new API instance if available
            let target = api ? api.targetProgress : container._targetProgress;
            if (target < 0) target = 0;
            if (target > 1) target = 1;
            
            currentProgress += (target - currentProgress) * 0.1;
            const visibleLength = 1 - currentProgress - gapOffset * 2;
            
            if (visibleLength <= 0) {
                track.style.strokeDasharray = `0 ${circumference}`;
                track.style.strokeDashoffset = 0;
                track.style.opacity = "0";
                stopIndicator.style.opacity = "0";
            } else {
                track.style.opacity = "1";
                stopIndicator.style.opacity = "1";
                const visibleTrack = visibleLength * circumference;
                const emptyTrack = circumference - visibleTrack;
                const gapTrack = (currentProgress + gapOffset) * circumference;
                track.style.strokeDasharray = `${visibleTrack} ${emptyTrack}`;
                track.style.strokeDashoffset = -gapTrack;
            }
            
            if (currentProgress <= 0.01) {
                path.setAttribute("d", "");
            } else {
                let currentAmplitude = amplitude;
                
                // Scale amplitude based on progress exactly as requested
                if (currentProgress <= 0.10 || currentProgress >= 0.90) {
                    currentAmplitude = 0;
                } else if (currentProgress > 0.10 && currentProgress <= 0.20) {
                    currentAmplitude = amplitude * ((currentProgress - 0.10) / 0.10);
                } else if (currentProgress < 0.90 && currentProgress >= 0.80) {
                    currentAmplitude = amplitude * ((0.90 - currentProgress) / 0.10);
                }
                
                let wavePath = "";
                const maxAngle = currentProgress * Math.PI * 2;
                const step = 0.05;
                
                for (let angle = 0; angle <= maxAngle; angle += step) {
                    const r = radius + Math.sin(angle * waves + phase) * currentAmplitude;
                    const x = center + Math.cos(angle) * r;
                    const y = center + Math.sin(angle) * r;
                    wavePath += (angle === 0 ? "M " : "L ") + `${x.toFixed(2)} ${y.toFixed(2)} `;
                }
                
                const rEnd = radius + Math.sin(maxAngle * waves + phase) * currentAmplitude;
                const xEnd = center + Math.cos(maxAngle) * rEnd;
                const yEnd = center + Math.sin(maxAngle) * rEnd;
                wavePath += `L ${xEnd.toFixed(2)} ${yEnd.toFixed(2)}`;
                
                path.setAttribute("d", wavePath);
            }
        }
        
        requestAnimationFrame(animate);
    }
    
    animate();
}