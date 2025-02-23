"use client";

import { refetchProduct } from "@/app/(app)/environments/[environmentId]/surveys/[surveyId]/edit/actions";
import { LoadingSkeleton } from "@/app/(app)/environments/[environmentId]/surveys/[surveyId]/edit/components/LoadingSkeleton";
import { useCallback, useEffect, useRef, useState } from "react";

import { createSegmentAction } from "@formbricks/ee/advancedTargeting/lib/actions";
import { extractLanguageCodes, getEnabledLanguages } from "@formbricks/lib/i18n/utils";
import useDocumentVisibility from "@formbricks/lib/useDocumentVisibility";
import { TActionClass } from "@formbricks/types/actionClasses";
import { TAttributeClass } from "@formbricks/types/attributeClasses";
import { TEnvironment } from "@formbricks/types/environment";
import { TMembershipRole } from "@formbricks/types/memberships";
import { TProduct } from "@formbricks/types/product";
import { TSegment } from "@formbricks/types/segment";
import { TSurvey } from "@formbricks/types/surveys";

import PreviewSurvey from "../../../components/PreviewSurvey";
import QuestionsAudienceTabs from "./QuestionsSettingsTabs";
import QuestionsView from "./QuestionsView";
import SettingsView from "./SettingsView";
import SurveyMenuBar from "./SurveyMenuBar";

interface SurveyEditorProps {
  survey: TSurvey;
  product: TProduct;
  environment: TEnvironment;
  actionClasses: TActionClass[];
  attributeClasses: TAttributeClass[];
  segments: TSegment[];
  responseCount: number;
  membershipRole?: TMembershipRole;
  colours: string[];
  isUserTargetingAllowed?: boolean;
  isMultiLanguageAllowed?: boolean;
  isFormbricksCloud: boolean;
}

export default function SurveyEditor({
  survey,
  product,
  environment,
  actionClasses,
  attributeClasses,
  segments,
  responseCount,
  membershipRole,
  isMultiLanguageAllowed,
  colours,
  isUserTargetingAllowed = false,
  isFormbricksCloud,
}: SurveyEditorProps): JSX.Element {
  const [activeView, setActiveView] = useState<"questions" | "settings">("questions");
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [localSurvey, setLocalSurvey] = useState<TSurvey | null>(survey);
  const [invalidQuestions, setInvalidQuestions] = useState<string[] | null>(null);
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>("default");
  const surveyEditorRef = useRef(null);
  const [localProduct, setLocalProduct] = useState<TProduct>(product);

  const fetchLatestProduct = useCallback(async () => {
    const latestProduct = await refetchProduct(localProduct.id);
    if (latestProduct) {
      setLocalProduct(latestProduct);
    }
  }, [localProduct.id]);

  useDocumentVisibility(fetchLatestProduct);

  useEffect(() => {
    if (survey) {
      const surveyClone = structuredClone(survey);
      setLocalSurvey(surveyClone);
      if (survey.questions.length > 0) {
        setActiveQuestionId(survey.questions[0].id);
      }
    }
  }, [survey]);

  useEffect(() => {
    const listener = () => {
      if (document.visibilityState === "visible") {
        const fetchLatestProduct = async () => {
          const latestProduct = await refetchProduct(localProduct.id);
          if (latestProduct) {
            setLocalProduct(latestProduct);
          }
        };
        fetchLatestProduct();
      }
    };
    document.addEventListener("visibilitychange", listener);
    return () => {
      document.removeEventListener("visibilitychange", listener);
    };
  }, [localProduct.id]);

  // when the survey type changes, we need to reset the active question id to the first question
  useEffect(() => {
    if (localSurvey?.questions?.length && localSurvey.questions.length > 0) {
      setActiveQuestionId(localSurvey.questions[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSurvey?.type, survey?.questions]);

  useEffect(() => {
    // if the localSurvey object has not been populated yet, do nothing
    if (!localSurvey) {
      return;
    }
    // do nothing if its not an in-app survey
    if (localSurvey.type !== "web") {
      return;
    }

    const createSegment = async () => {
      const createdSegment = await createSegmentAction({
        title: survey.id,
        description: "",
        environmentId: environment.id,
        surveyId: localSurvey.id,
        filters: [],
        isPrivate: true,
      });

      setLocalSurvey({
        ...localSurvey,
        segment: createdSegment,
      });
    };

    if (!localSurvey.segment?.id) {
      try {
        createSegment();
      } catch (err) {
        throw new Error("Error creating segment");
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [environment.id, isUserTargetingAllowed, localSurvey?.type, survey.id]);

  useEffect(() => {
    if (!localSurvey?.languages) return;
    const enabledLanguageCodes = extractLanguageCodes(getEnabledLanguages(localSurvey.languages ?? []));
    if (!enabledLanguageCodes.includes(selectedLanguageCode)) {
      setSelectedLanguageCode("default");
    }
  }, [localSurvey?.languages, selectedLanguageCode]);

  if (!localSurvey) {
    return <LoadingSkeleton />;
  }

  return (
    <>
      <div className="flex h-full flex-col">
        <SurveyMenuBar
          setLocalSurvey={setLocalSurvey}
          localSurvey={localSurvey}
          survey={survey}
          environment={environment}
          activeId={activeView}
          setActiveId={setActiveView}
          setInvalidQuestions={setInvalidQuestions}
          product={localProduct}
          responseCount={responseCount}
          selectedLanguageCode={selectedLanguageCode}
          setSelectedLanguageCode={setSelectedLanguageCode}
        />
        <div className="relative z-0 flex flex-1 overflow-hidden">
          <main className="relative z-0 flex-1 overflow-y-auto focus:outline-none" ref={surveyEditorRef}>
            <QuestionsAudienceTabs activeId={activeView} setActiveId={setActiveView} />

            {activeView === "questions" ? (
              <QuestionsView
                localSurvey={localSurvey}
                setLocalSurvey={setLocalSurvey}
                activeQuestionId={activeQuestionId}
                setActiveQuestionId={setActiveQuestionId}
                product={localProduct}
                invalidQuestions={invalidQuestions}
                setInvalidQuestions={setInvalidQuestions}
                selectedLanguageCode={selectedLanguageCode ? selectedLanguageCode : "default"}
                setSelectedLanguageCode={setSelectedLanguageCode}
                isMultiLanguageAllowed={isMultiLanguageAllowed}
                isFormbricksCloud={isFormbricksCloud}
              />
            ) : (
              <SettingsView
                environment={environment}
                localSurvey={localSurvey}
                setLocalSurvey={setLocalSurvey}
                actionClasses={actionClasses}
                attributeClasses={attributeClasses}
                segments={segments}
                responseCount={responseCount}
                membershipRole={membershipRole}
                colours={colours}
                isUserTargetingAllowed={isUserTargetingAllowed}
                isFormbricksCloud={isFormbricksCloud}
              />
            )}
          </main>

          <aside className="group hidden flex-1 flex-shrink-0 items-center justify-center overflow-hidden border-l border-slate-100 bg-slate-50 py-6 md:flex md:flex-col">
            <PreviewSurvey
              survey={localSurvey}
              setActiveQuestionId={setActiveQuestionId}
              activeQuestionId={activeQuestionId}
              product={localProduct}
              environment={environment}
              previewType={localSurvey.type === "web" ? "modal" : "fullwidth"}
              languageCode={selectedLanguageCode}
              onFileUpload={async (file) => file.name}
            />
          </aside>
        </div>
      </div>
    </>
  );
}
