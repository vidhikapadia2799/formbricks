import Button from "@/components/buttons/SubmitButton";
import Headline from "@/components/general/Headline";
import QuestionImage from "@/components/general/QuestionImage";
import RedirectCountDown from "@/components/general/RedirectCountdown";
import Subheader from "@/components/general/Subheader";
import { useEffect } from "preact/hooks";

import { getLocalizedValue } from "@formbricks/lib/i18n/utils";
import { TI18nString } from "@formbricks/types/surveys";

interface ThankYouCardProps {
  headline?: TI18nString;
  subheader?: TI18nString;
  redirectUrl: string | null;
  isRedirectDisabled: boolean;
  languageCode: string;
  buttonLabel?: TI18nString;
  buttonLink?: string;
  imageUrl?: string;
  replaceRecallInfo: (text: string) => string;
  isResponseSendingFinished: boolean;
}

export default function ThankYouCard({
  headline,
  subheader,
  redirectUrl,
  isRedirectDisabled,
  languageCode,
  buttonLabel,
  buttonLink,
  imageUrl,
  replaceRecallInfo,
  isResponseSendingFinished,
}: ThankYouCardProps) {
  useEffect(() => {
    if (!buttonLink || !isResponseSendingFinished) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        window.top?.location.replace(buttonLink);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [buttonLink, isResponseSendingFinished]);

  return (
    <div className="text-center">
      {imageUrl ? (
        <QuestionImage imgUrl={imageUrl} />
      ) : (
        <div>
          <div className="text-brand flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-24 w-24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <span className="bg-brand mb-[10px] inline-block h-1 w-16 rounded-[100%]"></span>
        </div>
      )}

      <div>
        <Headline
          alignTextCenter={true}
          headline={replaceRecallInfo(getLocalizedValue(headline, languageCode))}
          questionId="thankYouCard"
        />
        <Subheader
          subheader={replaceRecallInfo(getLocalizedValue(subheader, languageCode))}
          questionId="thankYouCard"
        />
        <RedirectCountDown redirectUrl={redirectUrl} isRedirectDisabled={isRedirectDisabled} />
        {buttonLabel && isResponseSendingFinished && (
          <div className="mt-6 flex w-full flex-col items-center justify-center space-y-4">
            <Button
              buttonLabel={getLocalizedValue(buttonLabel, languageCode)}
              isLastQuestion={false}
              onClick={() => {
                if (!buttonLink) return;
                window.location.replace(buttonLink);
              }}
            />
            <p class="text-xs">Press Enter ↵</p>
          </div>
        )}
      </div>
    </div>
  );
}
