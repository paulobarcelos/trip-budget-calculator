import { Disclosure } from '@headlessui/react';
import ReactMarkdown from 'react-markdown';

interface InstructionsProps {
  text: string;
}

export function Instructions({ text }: InstructionsProps) {
  return (
    <Disclosure as="div" className="mb-8">
      {({ open }) => (
        <>
          <Disclosure.Button className="flex w-full justify-between rounded-lg bg-gray-100 dark:bg-gray-800 px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring focus-visible:ring-gray-500 focus-visible:ring-opacity-75">
            <span>Instructions</span>
            <svg
              className={`${open ? 'rotate-180 transform' : ''} h-5 w-5 text-gray-500`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </Disclosure.Button>
          <Disclosure.Panel className="px-4 pt-4 pb-2 text-sm text-gray-500 dark:text-gray-400 prose dark:prose-invert max-w-none">
            <ReactMarkdown>{text}</ReactMarkdown>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}
