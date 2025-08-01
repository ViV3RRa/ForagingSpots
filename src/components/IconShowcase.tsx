import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import ChanterelleSvgIcon from './icons/ChanterelleSvgIcon';
import PorciniIcon from './icons/PorciniIcon';
import OysterMushroomIcon from './icons/OysterMushroomIcon';
import BlueberryIcon from './icons/BlueberryIcon';
import LingonberryIcon from './icons/LingonberryIcon';
import CloudberryIcon from './icons/CloudberryIcon';
import ElderberryIcon from './icons/ElderberryIcon';
import RoseHipIcon from './icons/RoseHipIcon';
import SeaBuckthornIcon from './icons/SeaBuckthornIcon';
import GenericMushroomIcon from './icons/GenericMushroomIcon';
import GenericBerryIcon from './icons/GenericBerryIcon';

// Simple local configuration to avoid import issues
const iconConfig = {
  chanterelle: { 
    label: 'Chanterelle', 
    color: 'bg-yellow-500',
    description: 'Golden trumpet-shaped mushroom with forked ridges'
  },
  porcini: { 
    label: 'Porcini', 
    color: 'bg-amber-700',
    description: 'Brown cap mushroom, highly prized for cooking'
  },
  oyster: { 
    label: 'Oyster Mushroom', 
    color: 'bg-gray-400',
    description: 'Fan-shaped mushroom growing on trees'
  },
  blueberry: { 
    label: 'Blueberry', 
    color: 'bg-blue-600',
    description: 'Small dark blue berries in clusters'
  },
  lingonberry: { 
    label: 'Lingonberry', 
    color: 'bg-red-500',
    description: 'Small red berries, popular in Scandinavian cuisine'
  },
  cloudberry: { 
    label: 'Cloudberry', 
    color: 'bg-orange-400',
    description: 'Rare orange aggregate berry, arctic delicacy'
  },
  elderberry: { 
    label: 'Elderberry', 
    color: 'bg-purple-800',
    description: 'Dark purple berries in umbrella-like clusters'
  },
  rosehip: { 
    label: 'Rose Hip', 
    color: 'bg-red-600',
    description: 'Red fruit of wild roses, high in vitamin C'
  },
  seabuckthorn: { 
    label: 'Sea Buckthorn', 
    color: 'bg-orange-500',
    description: 'Bright orange berries growing densely on branches'
  },
  other: { 
    label: 'Other', 
    color: 'bg-green-500',
    description: 'Other forageable items'
  },
} as const;

export default function IconShowcase() {
  const mushroomIcons = [
    { key: 'chanterelle', component: ChanterelleSvgIcon },
    { key: 'porcini', component: PorciniIcon },
    { key: 'oyster', component: OysterMushroomIcon },
    { key: 'other', component: GenericMushroomIcon, label: 'Other Mushroom' },
  ];

  const berryIcons = [
    { key: 'blueberry', component: BlueberryIcon },
    { key: 'lingonberry', component: LingonberryIcon },
    { key: 'cloudberry', component: CloudberryIcon },
    { key: 'elderberry', component: ElderberryIcon },
    { key: 'rosehip', component: RoseHipIcon },
    { key: 'seabuckthorn', component: SeaBuckthornIcon },
    { key: 'other', component: GenericBerryIcon, label: 'Other Berry' },
  ];

  const IconDisplay = ({ icon, iconKey, label }: { 
    icon: React.ComponentType<{ size?: number; className?: string }>, 
    iconKey: string, 
    label?: string
  }) => {
    const IconComponent = icon;
    const config = iconConfig[iconKey as keyof typeof iconConfig];
    const displayLabel = label || config?.label || iconKey;
    const color = config?.color || 'bg-gray-500';

    return (
      <div className="flex flex-col items-center space-y-3 p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow">
        {/* Large version */}
        <div className={`${color} rounded-full p-4 shadow-sm`}>
          <IconComponent size={32} className="text-white" />
        </div>
        
        {/* Different sizes */}
        <div className="flex items-center space-x-2">
          <div className={`${color} rounded-full p-2`}>
            <IconComponent size={16} className="text-white" />
          </div>
          <div className={`${color} rounded-full p-2.5`}>
            <IconComponent size={20} className="text-white" />
          </div>
          <div className={`${color} rounded-full p-3`}>
            <IconComponent size={24} className="text-white" />
          </div>
        </div>
        
        {/* Gray version */}
        <div className="bg-gray-600 rounded-full p-3">
          <IconComponent size={24} className="text-white" />
        </div>
        
        {/* Label */}
        <div className="text-center">
          <p className="font-medium text-sm text-gray-900">{displayLabel}</p>
          {config?.description && (
            <p className="text-xs text-gray-500 mt-1 max-w-32">{config.description}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-earth-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold text-gray-900">Danish Foraging Icons</h1>
          <p className="text-gray-600">SVG icon package for mushrooms and berries popular in Denmark</p>
          <Badge variant="secondary" className="mt-2">
            {mushroomIcons.length + berryIcons.length} Total Icons
          </Badge>
        </div>

        {/* Mushroom Icons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🍄 Mushroom Icons
              <Badge variant="outline">{mushroomIcons.length} icons</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {mushroomIcons.map(({ key, component, label }) => (
                <IconDisplay 
                  key={key}
                  icon={component}
                  iconKey={key}
                  label={label}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Berry Icons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🫐 Berry Icons
              <Badge variant="outline">{berryIcons.length} icons</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {berryIcons.map(({ key, component, label }) => (
                <IconDisplay 
                  key={`berry-${key}`}
                  icon={component}
                  iconKey={key}
                  label={label}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Usage Example */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Examples</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Individual Icon Import:</h4>
              <code className="text-sm text-gray-700">
                {`import ChanterelleSvgIcon from './components/icons/ChanterelleSvgIcon';`}
              </code>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Direct Usage:</h4>
              <code className="text-sm text-gray-700">
                {`<ChanterelleSvgIcon size={24} className="text-yellow-500" />`}
              </code>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">With Helper (from index):</h4>
              <code className="text-sm text-gray-700">
                {`import { getForagingIcon } from './components/icons';
const icon = getForagingIcon('elderberry', { size: 24 });`}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Popular Danish Foraging Info */}
        <Card>
          <CardHeader>
            <CardTitle>About Danish Foraging</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p className="text-gray-600">
              Denmark offers excellent foraging opportunities throughout the year. These icons represent some of the most 
              popular and commonly found edible mushrooms and berries in Danish forests, parks, and coastal areas.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Best Mushroom Seasons:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li><strong>Chanterelles:</strong> July - October</li>
                  <li><strong>Porcini:</strong> August - November</li>
                  <li><strong>Oyster Mushrooms:</strong> October - March</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Best Berry Seasons:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li><strong>Elderberries:</strong> August - September</li>
                  <li><strong>Sea Buckthorn:</strong> September - October</li>
                  <li><strong>Rose Hips:</strong> September - November</li>
                  <li><strong>Lingonberries:</strong> August - September</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}