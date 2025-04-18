export default function Results({ data }) {
  if (!data) return null;
  
  return (
    <div className="mt-8 p-6 bg-slate-50 rounded-lg shadow-md border border-slate-200">
      <h2 className="text-xl font-bold mb-4 text-slate-800">Evaluation Results</h2>
      
      <div className="mb-6">
        <h3 className="font-semibold text-lg text-slate-700">Match Score</h3>
        <div className="flex items-center mt-3">
          <div className="w-full bg-slate-200 rounded-full h-4">
            <div 
              className="h-4 rounded-full bg-teal-500" 
              style={{ width: `${data.overallMatch}%` }}
            ></div>
          </div>
          <span className="ml-3 font-medium text-slate-700">{data.overallMatch}%</span>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="font-semibold text-lg text-slate-700">Summary</h3>
        <p className="mt-2 text-slate-600">{data.summary}</p>
      </div>
      
      <div className="mb-6">
        <h3 className="font-semibold text-lg mb-3 text-slate-700">Skill Match</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.skillMatch && Object.entries(data.skillMatch).map(([skill, score]) => (
            <div key={skill} className="bg-white p-3 rounded border border-slate-200">
              <div className="flex justify-between mb-2">
                <span className="text-slate-700">{skill}</span>
                <span className="font-medium text-slate-700">{score}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-teal-500" 
                  style={{ width: `${score}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-6">
        <h3 className="font-semibold text-lg mb-3 text-slate-700">Recommendations</h3>
        <ul className="list-disc pl-5 space-y-2">
          {data.recommendations && data.recommendations.map((rec, index) => (
            <li key={index} className="text-slate-600">{rec}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}