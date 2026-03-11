type StepIndicatorProps = {
  currentStep: number;
};

const steps = [
  "Registro",
  "Funcionários",
  "Serviços",
  "Fotos",
  "NF's",
];

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <>
      <div className="rdo-step-indicator rdo-step-indicator-desktop">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = currentStep === stepNumber;
          const isCompleted = currentStep > stepNumber;

          return (
            <div
              key={step}
              style={{
                display: "flex",
                alignItems: "center",
                flex: 1,
                minWidth: 0,
                gap: 12,
              }}
            >
              <div
                className={`rdo-step-item ${
                  isActive ? "active" : isCompleted ? "completed" : ""
                }`}
              >
                <div className="rdo-step-circle">
                  {isCompleted ? "✓" : stepNumber}
                </div>
                <div className="rdo-step-label">{step}</div>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`rdo-step-line ${
                    currentStep > stepNumber ? "active" : ""
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="rdo-step-mobile">
        <div className="rdo-step-mobile-top">
          <div className="rdo-step-mobile-circle">{currentStep}</div>

          <div className="rdo-step-mobile-texts">
            <div className="rdo-step-mobile-kicker">
              Etapa {currentStep} de {steps.length}
            </div>
            <div className="rdo-step-mobile-title">{steps[currentStep - 1]}</div>
          </div>
        </div>

        <div className="rdo-step-mobile-progress">
          <div
            className="rdo-step-mobile-progress-bar"
            style={{
              width: `${(currentStep / steps.length) * 100}%`,
            }}
          />
        </div>
      </div>
    </>
  );
}