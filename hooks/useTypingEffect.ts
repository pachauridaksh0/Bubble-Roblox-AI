import { useState, useEffect } from 'react';

/**
 * A hook that simulates a typing effect for a given string.
 * @param fullText The complete text to be typed out.
 * @param isEnabled If false, the hook immediately returns the full text.
 * @param speed The delay in milliseconds between each character.
 * @returns The partially or fully typed string.
 */
export function useTypingEffect(fullText: string, isEnabled: boolean, speed = 10) {
    const [typedText, setTypedText] = useState('');

    useEffect(() => {
        if (!isEnabled) {
            // If typing is disabled (e.g., message finished loading), snap to the full text.
            setTypedText(fullText);
            return;
        }

        // If we've already typed more than the current full text (shouldn't happen, but a safeguard),
        // or if we've finished typing, do nothing.
        if (typedText.length >= fullText.length) {
            return;
        }

        // Set a timeout to add the next character.
        const timeoutId = setTimeout(() => {
            setTypedText(fullText.slice(0, typedText.length + 1));
        }, speed);

        // Cleanup the timeout if the component unmounts or dependencies change.
        return () => clearTimeout(timeoutId);
    }, [typedText, fullText, isEnabled, speed]);

    // When a component is being enabled for typing (for a new message),
    // we need to reset its state. This is triggered when a new temp message is created
    // with an empty `fullText`.
    useEffect(() => {
        if (isEnabled && fullText === '') {
            setTypedText('');
        }
    }, [isEnabled, fullText]);

    return typedText;
}