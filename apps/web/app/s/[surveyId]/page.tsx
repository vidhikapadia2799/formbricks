import { validateSurveySingleUseId } from "@/app/lib/singleUseSurveys";
import LegalFooter from "@/app/s/[surveyId]/components/LegalFooter";
import LinkSurvey from "@/app/s/[surveyId]/components/LinkSurvey";
import { MediaBackground } from "@/app/s/[surveyId]/components/MediaBackground";
import PinScreen from "@/app/s/[surveyId]/components/PinScreen";
import SurveyInactive from "@/app/s/[surveyId]/components/SurveyInactive";
import { checkValidity } from "@/app/s/[surveyId]/lib/prefilling";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getMultiLanguagePermission } from "@formbricks/ee/lib/service";
import { IMPRINT_URL, IS_FORMBRICKS_CLOUD, PRIVACY_URL, WEBAPP_URL } from "@formbricks/lib/constants";
import { createPerson, getPersonByUserId } from "@formbricks/lib/person/service";
import { getProductByEnvironmentId } from "@formbricks/lib/product/service";
import { getResponseBySingleUseId, getResponseCountBySurveyId } from "@formbricks/lib/response/service";
import { getSurvey } from "@formbricks/lib/survey/service";
import { getTeamByEnvironmentId } from "@formbricks/lib/team/service";
import { ZId } from "@formbricks/types/environment";
import { TResponse } from "@formbricks/types/responses";

import { getEmailVerificationDetails } from "./lib/helpers";

interface LinkSurveyPageProps {
  params: {
    surveyId: string;
  };
  searchParams: {
    suId?: string;
    userId?: string;
    verify?: string;
    lang?: string;
  };
}

export async function generateMetadata({ params }: LinkSurveyPageProps): Promise<Metadata> {
  const validId = ZId.safeParse(params.surveyId);
  if (!validId.success) {
    notFound();
  }

  const survey = await getSurvey(params.surveyId);

  if (!survey || survey.type !== "link" || survey.status === "draft") {
    notFound();
  }

  const product = await getProductByEnvironmentId(survey.environmentId);

  if (!product) {
    throw new Error("Product not found");
  }

  function getNameForURL(string) {
    return string.replace(/ /g, "%20");
  }

  function getBrandColorForURL(string) {
    return string.replace(/#/g, "%23");
  }

  const brandColor = getBrandColorForURL(product.brandColor);
  const surveyName = getNameForURL(survey.name);

  const ogImgURL = `/api/v1/og?brandColor=${brandColor}&name=${surveyName}`;

  return {
    title: survey.name,
    metadataBase: new URL(WEBAPP_URL),
    openGraph: {
      title: survey.name,
      description: "Create your own survey like this with Formbricks' open source survey suite.",
      url: `/s/${survey.id}`,
      siteName: "",
      images: [ogImgURL],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: survey.name,
      description: "Create your own survey like this with Formbricks' open source survey suite.",
      images: [ogImgURL],
    },
  };
}

export default async function LinkSurveyPage({ params, searchParams }: LinkSurveyPageProps) {
  const validId = ZId.safeParse(params.surveyId);
  if (!validId.success) {
    notFound();
  }
  const survey = await getSurvey(params.surveyId);

  const suId = searchParams.suId;
  const langParam = searchParams.lang; //can either be language code or alias
  const isSingleUseSurvey = survey?.singleUse?.enabled;
  const isSingleUseSurveyEncrypted = survey?.singleUse?.isEncrypted;

  if (!survey || survey.type !== "link" || survey.status === "draft") {
    notFound();
  }

  const team = await getTeamByEnvironmentId(survey?.environmentId);
  if (!team) {
    throw new Error("Team not found");
  }
  const isMultiLanguageAllowed = getMultiLanguagePermission(team);

  if (survey && survey.status !== "inProgress") {
    return (
      <SurveyInactive
        status={survey.status}
        surveyClosedMessage={survey.surveyClosedMessage ? survey.surveyClosedMessage : undefined}
      />
    );
  }

  let singleUseId: string | undefined = undefined;
  if (isSingleUseSurvey) {
    // check if the single use id is present for single use surveys
    if (!suId) {
      return <SurveyInactive status="link invalid" />;
    }

    // if encryption is enabled, validate the single use id
    let validatedSingleUseId: string | undefined = undefined;
    if (isSingleUseSurveyEncrypted) {
      validatedSingleUseId = validateSurveySingleUseId(suId);
      if (!validatedSingleUseId) {
        return <SurveyInactive status="link invalid" />;
      }
    }
    // if encryption is disabled, use the suId as is
    singleUseId = validatedSingleUseId ?? suId;
  }

  let singleUseResponse: TResponse | undefined = undefined;
  if (isSingleUseSurvey) {
    try {
      singleUseResponse = singleUseId
        ? (await getResponseBySingleUseId(survey.id, singleUseId)) ?? undefined
        : undefined;
    } catch (error) {
      singleUseResponse = undefined;
    }
  }

  // verify email: Check if the survey requires email verification
  let emailVerificationStatus: string = "";
  let verifiedEmail: string | undefined = undefined;

  if (survey.verifyEmail) {
    const token =
      searchParams && Object.keys(searchParams).length !== 0 && searchParams.hasOwnProperty("verify")
        ? searchParams.verify
        : undefined;

    if (token) {
      const emailVerificationDetails = await getEmailVerificationDetails(survey.id, token);
      emailVerificationStatus = emailVerificationDetails.status;
      verifiedEmail = emailVerificationDetails.email;
    }
  }

  // get product and person
  const product = await getProductByEnvironmentId(survey.environmentId);
  if (!product) {
    throw new Error("Product not found");
  }

  const getLanguageCode = (): string => {
    if (!langParam || !isMultiLanguageAllowed) return "default";
    else {
      const selectedLanguage = survey.languages.find((surveyLanguage) => {
        return surveyLanguage.language.code === langParam || surveyLanguage.language.alias === langParam;
      });
      if (selectedLanguage?.default || !selectedLanguage?.enabled) {
        return "default";
      }
      return selectedLanguage ? selectedLanguage.language.code : "default";
    }
  };

  const languageCode = getLanguageCode();

  const userId = searchParams.userId;
  if (userId) {
    // make sure the person exists or get's created
    const person = await getPersonByUserId(survey.environmentId, userId);
    if (!person) {
      await createPerson(survey.environmentId, userId);
    }
  }

  const isSurveyPinProtected = Boolean(!!survey && survey.pin);
  const responseCount = await getResponseCountBySurveyId(survey.id);

  // question pre filling: Check if the first question is prefilled and if it is valid
  const prefillAnswer = searchParams[survey.questions[0].id];
  const isPrefilledAnswerValid = prefillAnswer
    ? checkValidity(survey!.questions[0], prefillAnswer, languageCode)
    : false;

  if (isSurveyPinProtected) {
    return (
      <PinScreen
        surveyId={survey.id}
        product={product}
        userId={userId}
        emailVerificationStatus={emailVerificationStatus}
        prefillAnswer={isPrefilledAnswerValid ? prefillAnswer : null}
        singleUseId={isSingleUseSurvey ? singleUseId : undefined}
        singleUseResponse={singleUseResponse ? singleUseResponse : undefined}
        webAppUrl={WEBAPP_URL}
        IMPRINT_URL={IMPRINT_URL}
        PRIVACY_URL={PRIVACY_URL}
        IS_FORMBRICKS_CLOUD={IS_FORMBRICKS_CLOUD}
        verifiedEmail={verifiedEmail}
        languageCode={languageCode}
      />
    );
  }

  return survey ? (
    <div className="relative">
      <MediaBackground survey={survey}>
        <LinkSurvey
          survey={survey}
          product={product}
          userId={userId}
          emailVerificationStatus={emailVerificationStatus}
          prefillAnswer={isPrefilledAnswerValid ? prefillAnswer : null}
          singleUseId={isSingleUseSurvey ? singleUseId : undefined}
          singleUseResponse={singleUseResponse ? singleUseResponse : undefined}
          webAppUrl={WEBAPP_URL}
          responseCount={survey.welcomeCard.showResponseCount ? responseCount : undefined}
          verifiedEmail={verifiedEmail}
          languageCode={languageCode}
        />
      </MediaBackground>
      <LegalFooter
        bgColor={survey.styling?.background?.bg || "#ffff"}
        IMPRINT_URL={IMPRINT_URL}
        PRIVACY_URL={PRIVACY_URL}
        IS_FORMBRICKS_CLOUD={IS_FORMBRICKS_CLOUD}
        surveyUrl={WEBAPP_URL + "/s/" + survey.id}
      />
    </div>
  ) : null;
}
