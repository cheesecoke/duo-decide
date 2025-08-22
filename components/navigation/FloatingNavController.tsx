import React from 'react';
import { useFloatingNav } from '@/context/floating-nav-provider';
import { FloatingNav } from '@/components/navigation/FloatingNav/FloatingNav';

export default function FloatingNavController() {
	const { config } = useFloatingNav();

	// Only render if config shows nav should be visible
	if (!config.show) {
		return null;
	}

	return (
		<FloatingNav
			createButtonText={config.createButtonText}
			onCreatePress={config.onCreatePress}
			position={config.position}
		/>
	);
}