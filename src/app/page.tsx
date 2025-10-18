import Image from "next/image";
import { 
  runServerEffect, 
  createHelloWorldEffect, 
  createGreetingEffect,
  createDemoEffect,
  getMessage,
  getAllMessages
} from "@/lib/server-runtime";

export default function Home() {
  // Run Effect-TS programs with service layer in server component
  const helloMessage = runServerEffect(createHelloWorldEffect());
  const greetingMessage = runServerEffect(createGreetingEffect("Effect-TS Developer"));
  const demoMessage = runServerEffect(createDemoEffect());
  
  // Get specific messages using the service
  const welcomeMessage = runServerEffect(getMessage("1"));
  const infoMessage = runServerEffect(getMessage("2"));
  const allMessages = runServerEffect(getAllMessages());

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        
        {/* Effect-TS Hello World Section */}
        <div className="flex flex-col gap-4 items-center sm:items-start">
          <h1 className="text-2xl font-bold text-center sm:text-left">
            {helloMessage}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 text-center sm:text-left">
            {greetingMessage}
          </p>
          <p className="text-base text-blue-600 dark:text-blue-400 text-center sm:text-left">
            {demoMessage}
          </p>
          
          {/* Service Messages Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-md">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
              📨 Service Messages:
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
              {welcomeMessage.text}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
              {infoMessage.text}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Total messages: {allMessages.length}
            </p>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 max-w-md">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✨ This page is powered by <strong>Effect-TS</strong> with <strong>Context & Services</strong>!
            </p>
          </div>
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={20}
              height={20}
            />
            Deploy now
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read our docs
          </a>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
